/** Candidate recipes. Publication requires real signed and Verifier tests. */
export function spotifyTrackRecipe({ collectionUri, offset }) {
  if (!/^spotify:playlist:[A-Za-z0-9]{22}$/.test(collectionUri) || !Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid Spotify selection.');
  return {
    name: 'Early Spotify saved track',
    url: 'https://api-partner.spotify.com/pathfinder/v2/query', method: 'POST',
    body: '{"variables":{"uri":"{{collection_uri}}","offset":{{offset}},"limit":1,"enableWatchFeedEntrypoint":true,"includeEpisodeContentRatingsV2":true},"operationName":"fetchPlaylist","extensions":{"persistedQuery":{"version":1,"sha256Hash":"8964e8eafb21aa992a7d951d256d83285c04be2105d209262901de70cb97584a"}}}',
    responseMatches: [
      { type: 'regex', value: '(?<saved_item>\\{"addedAt":\\{"isoString":"[^"\\\\]+"\\}[\\s\\S]*?"uid":"[^"\\\\]+"\\})' },
      { type: 'regex', value: '"ownerV2":\\{"data":\\{[\\s\\S]*?"uri":"(?<collection_owner>spotify:user:[A-Za-z0-9]+)"' },
      { type: 'contains', value: '"format":"liked-songs"' },
      { type: 'contains', value: '"canEditItems":true' },
    ],
    responseRedactions: [
      { jsonPath: '$.data.playlistV2.content.items[0]' },
      { jsonPath: '$.data.playlistV2.ownerV2' },
      { jsonPath: '$.data.playlistV2.format', regex: '"format":"liked-songs"' },
      { jsonPath: '$.data.playlistV2.currentUserCapabilities.canEditItems', regex: '"canEditItems":true' },
    ],
    paramValues: { collection_uri: collectionUri, offset: String(offset) },
  };
}

export function spotifyTrackUserScript() {
  const { url, method, body, responseMatches, responseRedactions } = spotifyTrackRecipe({ collectionUri: 'spotify:playlist:0000000000000000000000', offset: 0 });
  function run(recipe) {
    if (location.hostname !== 'open.spotify.com' || window.__earlySpotifyInstalled) return;
    window.__earlySpotifyInstalled = true;
    const originalFetch = window.fetch;
    let busy = false;
    let complete = false;
    async function inspect(input, init, response) {
      if (busy || complete || !window.Reclaim || response.status !== 200) return;
      const requestUrl = typeof input === 'string' ? input : input.url;
      if (requestUrl !== recipe.url) return;
      const requestBody = init?.body ?? (input instanceof Request ? await input.clone().text() : '');
      if (typeof requestBody !== 'string') return;
      let query;
      try { query = JSON.parse(requestBody); } catch { return; }
      if (query.operationName !== 'fetchPlaylist' || query.extensions?.persistedQuery?.sha256Hash !== '8964e8eafb21aa992a7d951d256d83285c04be2105d209262901de70cb97584a') return;
      let data = (await response.json()).data?.playlistV2;
      if (data?.format !== 'liked-songs') return;
      busy = true;
      window.Reclaim.canExpectManyClaims(true);
      try {
        const parameters = window.Reclaim.parameters ?? {};
        const cutoffMs = parameters.cutoff ? Date.parse(parameters.cutoff) : Infinity;
        if (parameters.cutoff && !Number.isFinite(cutoffMs)) throw new Error('Invalid cutoff date.');
        for (const key of ['track_id', 'artist_id']) if (parameters[key] && !/^[A-Za-z0-9]{22}$/.test(parameters[key])) throw new Error('Invalid Spotify target.');
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        headers.delete('priority');
        headers.delete('cookie');
        let offset = query.variables.offset ?? 0;
        for (let page = 0; page < 100; page++) {
          const items = data.content?.items ?? [];
          const index = items.findIndex(item => {
            const track = item.itemV2?.data;
            return track?.__typename === 'Track'
              && (!parameters.track_id || track.uri === `spotify:track:${parameters.track_id}`)
              && (!parameters.artist_id || track.artists?.items.some(a => a.uri === `spotify:artist:${parameters.artist_id}`))
              && Date.parse(item.addedAt?.isoString) < cutoffMs;
          });
          if (index >= 0) {
            const collection = query.variables.uri;
            if (!/^spotify:playlist:[A-Za-z0-9]{22}$/.test(collection)) throw new Error('Unsupported collection.');
            const selectedOffset = offset + index;
            const actualBody = recipe.body.replace('{{collection_uri}}', collection).replace('{{offset}}', String(selectedOffset));
            const claimId = await window.Reclaim.requestClaim({ url: recipe.url, method: recipe.method,
              responseMatches: recipe.responseMatches, responseRedactions: recipe.responseRedactions,
              bodySniff: { enabled: true, template: recipe.body }, requestBody: actualBody,
              headers: Object.fromEntries(headers), credentials: 'include',
              witnessParameters: { collection_uri: collection, offset: String(selectedOffset) } });
            if (!claimId) throw new Error('The proof request could not be started.');
            complete = true;
            window.Reclaim.canExpectManyClaims(false);
            return;
          }
          offset += items.length;
          if (!items.length || offset >= data.content.totalCount) throw new Error('No matching saved track was found in this collection. Another activity may qualify.');
          query.variables.offset = offset;
          const next = await originalFetch.call(window, recipe.url, { method: 'POST', headers, body: JSON.stringify(query), credentials: 'include' });
          if (!next.ok) throw new Error('Spotify could not load the next page. Please retry.');
          data = (await next.json()).data?.playlistV2;
          if (data?.format !== 'liked-songs') throw new Error('Spotify returned an unexpected collection.');
        }
        throw new Error('The search reached its page limit. Older activity has not been ruled out.');
      } catch (error) {
        window.Reclaim.canExpectManyClaims(false);
        window.Reclaim.reportProviderError({ message: error.message });
      } finally { busy = false; }
    }
    window.fetch = function(input, init) {
      return originalFetch.apply(this, arguments).then(response => {
        inspect(input, init, response.clone()).catch(() => {});
        return response;
      });
    };
  }
  return `(${run.toString()})(${JSON.stringify({ url, method, body, responseMatches, responseRedactions })});`;
}

export function youtubeSubscriptionRecipe({ timestamp, channelId }) {
  if (!/^\d{16}$/.test(timestamp) || !/^UC[\w-]{22}$/.test(channelId)) {
    throw new Error('Invalid subscription selection.');
  }
  // Google currently emits a 115-byte opaque event token. Reveal the two
  // adjacent pieces around it, never the token. The attestor must retain
  // redaction framing (3.2+); older versions fail this match closed.
  const prefix = '\\[null,null,null,\\[26\\],';
  const suffix = '",null,\\["YouTube",null,"//www\\.gstatic\\.com/images/branding/product/2x/youtube_2024_q4_24dp\\.png"\\],null,\\["(?:[^"\\\\]|\\\\.)*",null,"Subscribed to","https://www\\.youtube\\.com/channel/';
  return {
    name: 'Early YouTube dated subscription',
    url: 'https://myactivity.google.com/page?page=youtube_subscriptions',
    method: 'GET',
    responseMatches: [
      { type: 'regex', value: '"S06Grb":"(?<source_account_id>\\d+)"' },
      { type: 'regex', value: `${prefix}(?<activity_timestamp>\\d{16}),"\\*{115}${suffix}(?<channel_id>UC[A-Za-z0-9_-]{22})"\\]` },
      // JS SDK 5.6 hashes redactions by match index. Keep all three slices
      // covered by the hash; otherwise it silently omits the last redaction.
      { type: 'contains', value: '"Subscribed to"' },
    ],
    responseRedactions: [
      { xPath: '//script[@data-id="_gd"]', regex: '"S06Grb":"\\d+"' },
      { xPath: '//script[@class="ds:3"]', regex: `${prefix}{{selected_timestamp}},"` },
      { xPath: '//script[@class="ds:3"]', regex: `${suffix}{{selected_channel_id}}"\\]` },
    ],
    paramValues: { selected_timestamp: timestamp, selected_channel_id: channelId },
  };
}

export function youtubeSubscriptionUserScript() {
  const { url, method, responseMatches, responseRedactions } = youtubeSubscriptionRecipe({
    timestamp: '1000000000000000', channelId: 'UC0000000000000000000000',
  });
  function run(recipe) {
    if (location.hostname !== 'myactivity.google.com' || window.__earlySubscriptionStarted) return;
    const timer = setInterval(async () => {
      const bridge = window.Reclaim;
      const script = document.querySelector('script.ds\\:3');
      if (!bridge || !script || !script.textContent.includes('data:')) return;
      clearInterval(timer);
      window.__earlySubscriptionStarted = true;
      try {
        bridge.canExpectManyClaims(true);
        const source = script.textContent;
        const rows = JSON.parse(source.slice(source.indexOf('data:') + 5, source.lastIndexOf(', sideChannel:')))[0];
        const wanted = bridge.parameters?.channel_id;
        const cutoff = bridge.parameters?.cutoff;
        if (wanted && !/^UC[A-Za-z0-9_-]{22}$/.test(wanted)) throw new Error('Invalid requested channel.');
        const cutoffMs = cutoff ? Date.parse(cutoff) : Infinity;
        if (!Number.isFinite(cutoffMs) && cutoff) throw new Error('Invalid cutoff date.');
        const row = rows.find(r => r[9]?.[2] === 'Subscribed to'
          && (!wanted || r[9][3] === `https://www.youtube.com/channel/${wanted}`)
          && Number(r[4]) / 1000 < cutoffMs);
        if (!row) throw new Error('No matching subscription is present in the loaded activity page. Older activity may require another page.');
        if (typeof row[5] !== 'string' || row[5].length !== 115) throw new Error('YouTube changed its activity format. Please try another evidence route.');
        const claimId = await window.Reclaim.requestClaim({ ...recipe, credentials: 'include',
          witnessParameters: { selected_timestamp: String(row[4]), selected_channel_id: row[9][3].split('/').at(-1) } });
        if (!claimId) throw new Error('The proof request could not be started.');
        bridge.canExpectManyClaims(false);
      } catch (error) {
        bridge.canExpectManyClaims(false);
        bridge.reportProviderError({ message: error.message });
      }
    }, 500);
  }
  return `(${run.toString()})(${JSON.stringify({ url, method, responseMatches, responseRedactions })});`;
}
