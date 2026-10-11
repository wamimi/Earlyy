// Reviewed against Google My Activity's English youtube_likes response.
// Proves one source-recorded like, not a watch, first-ever like, or current state.
export function youtubeLikeRecipe({ timestamp, videoId, channelId }) {
  if (!/^\d{16}$/.test(timestamp) || !/^[A-Za-z0-9_-]{11}$/.test(videoId) || !/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) throw new Error('Invalid video-like selection.');
  const string = '"(?:[^"\\\\]|\\\\.)*"';
  const prefix = '\\[null,null,null,\\[26\\],';
  const middle = '",null,\\["YouTube",null,"//www\\.gstatic\\.com/images/branding/product/2x/youtube_2024_q4_24dp\\.png"\\],null,\\[' + string + ',null,"Liked","https://www\\.youtube\\.com/watch\\?v(?:=|\\\\u003d)';
  const between = '"\\],null,null,null,null,null,null,null,\\[""\\],null,null,null,null,null,\\["';
  const tail = '",' + string + '\\],null,null,null,\\[\\[1000\\]\\],\\[\\[26,"YouTube"\\]\\],null,null,null,\\[\\[null,' + string + ',null,"https://www\\.youtube\\.com/channel/';
  const end = '"\\]\\]\\]';
  return {
    name: 'Early YouTube dated video like',
    url: 'https://myactivity.google.com/page?page=youtube_likes&hl=en', method: 'GET',
    responseMatches: [
      { type: 'regex', value: '"S06Grb":"(?<source_account_id>\\d+)"' },
      { type: 'regex', value: `${prefix}(?<activity_timestamp>\\d{16}),"\\*{100}${middle}(?<video_id>[A-Za-z0-9_-]{11})${between}\\*{48}${tail}(?<channel_id>UC[A-Za-z0-9_-]{22})${end}` },
      { type: 'contains', value: '"Liked"' },
      { type: 'contains', value: 'https://www.youtube.com/channel/' },
    ],
    responseRedactions: [
      { xPath: '//script[@data-id="_gd"]', regex: '"S06Grb":"\\d+"' },
      { xPath: '//script[@class="ds:3"]', regex: `${prefix}{{selected_timestamp}},"` },
      { xPath: '//script[@class="ds:3"]', regex: `${middle}{{selected_video_id}}${between}` },
      { xPath: '//script[@class="ds:3"]', regex: `${tail}{{selected_channel_id}}${end}` },
    ],
    paramValues: { selected_timestamp: timestamp, selected_video_id: videoId, selected_channel_id: channelId },
  };
}

export function youtubeLikeUserScript() {
  const { url, method, responseMatches, responseRedactions } = youtubeLikeRecipe({ timestamp: '1000000000000000', videoId: '00000000000', channelId: 'UC0000000000000000000000' });
  function run(recipe) {
    if (location.hostname !== 'myactivity.google.com' || window.__earlyLikeStarted) return;
    const timer = setInterval(async () => {
      const bridge = window.Reclaim, script = document.querySelector('script.ds\\:3');
      if (!bridge || !script || !script.textContent.includes('data:')) return;
      clearInterval(timer); window.__earlyLikeStarted = true;
      try {
        bridge.canExpectManyClaims(true);
        const wanted = bridge.parameters?.video_id, cutoff = bridge.parameters?.cutoff;
        if (!/^[A-Za-z0-9_-]{11}$/.test(wanted ?? '')) throw new Error('Choose an exact YouTube video before verifying.');
        if (cutoff && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(cutoff) || !Number.isFinite(Date.parse(cutoff)))) throw new Error('Invalid cutoff date.');
        const source = script.textContent;
        const rows = JSON.parse(source.slice(source.indexOf('data:') + 5, source.lastIndexOf(', sideChannel:')))[0];
        const row = rows.find(r => r[9]?.[2] === 'Liked' && r[9]?.[3] === `https://www.youtube.com/watch?v=${wanted}`
          && Number.isSafeInteger(r[4]) && /^\d{16}$/.test(String(r[4]))
          && (!cutoff || BigInt(r[4]) + 1n <= BigInt(Date.parse(cutoff)) * 1000n));
        if (!row) throw new Error('No qualifying like for this video appears in the loaded activity page. Older or deleted activity may be unavailable; this does not establish that you never liked it.');
        const channel = row[32]?.[0]?.[3]?.match(/^https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})$/)?.[1];
        if (typeof row[5] !== 'string' || row[5].length !== 100 || typeof row[23]?.[0] !== 'string' || row[23][0].length !== 48 || !channel) throw new Error('YouTube changed its activity format. No proof was submitted.');
        const id = await window.Reclaim.requestClaim({ ...recipe, credentials: 'include', witnessParameters: {
          selected_timestamp: String(row[4]), selected_video_id: wanted, selected_channel_id: channel,
        } });
        if (!id) bridge.log?.('info', 'Claim submitted; waiting for the Verifier result.');
      } catch (error) { bridge.reportProviderError({ message: error.message }); }
      finally { bridge.canExpectManyClaims(false); }
    }, 500);
  }
  return `(${run.toString()})(${JSON.stringify({ url, method, responseMatches, responseRedactions })});`;
}
