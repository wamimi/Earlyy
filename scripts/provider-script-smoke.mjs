// Real browser script smoke test with a local stub of the Verifier bridge.
// This checks discovery/selection only; it does not count as a Verifier proof.
import { pathToFileURL } from 'node:url';
import { spotifyTrackUserScript, youtubeSubscriptionUserScript } from './provider-recipes.mjs';
import { spotifyUserAgent } from './provider-client-config.mjs';
const { connectCdp } = await import(pathToFileURL(`${process.env.RECLAIM_AGENT_ROOT}/lib/cdp/client.js`).href);
const browser = await connectCdp(9222);
const tab = await browser.attachToTab(process.env.EARLY_CAPTURE_TAB);
await tab.send('Page.enable');
await tab.send('Runtime.enable');
try {
  for (const scenario of [
    { platform: 'spotify', url: 'https://open.spotify.com/collection/tracks', script: spotifyTrackUserScript(), parameters: process.env.EARLY_SCRIPT_TRACK_ID ? { track_id: process.env.EARLY_SCRIPT_TRACK_ID } : {} },
    { platform: 'youtube', url: 'https://myactivity.google.com/page?page=youtube_subscriptions', script: youtubeSubscriptionUserScript(), parameters: process.env.EARLY_SCRIPT_CHANNEL_ID ? { channel_id: process.env.EARLY_SCRIPT_CHANNEL_ID } : {} },
  ].filter(s => !process.env.EARLY_SCRIPT_PLATFORM || s.platform === process.env.EARLY_SCRIPT_PLATFORM)) {
    if (scenario.platform === 'spotify') await tab.send('Network.setUserAgentOverride', { userAgent: spotifyUserAgent.android });
    const stub = `window.Reclaim={parameters:${JSON.stringify(scenario.parameters)},canExpectManyClaims(){},reportProviderError(e){window.__earlyTestError=e.message},requestClaim:async function(c){window.__earlyTestClaim={url:c.url,method:c.method,parameters:c.witnessParameters,bodyTemplatePresent:!!c.bodySniff?.template,authenticationPresent:!!Object.keys(c.headers||{}).find(k=>k.toLowerCase()==='authorization')};return 'local-script-test';}};`;
    const { identifier } = await tab.send('Page.addScriptToEvaluateOnNewDocument', { source: stub + scenario.script });
    try {
      await tab.send('Page.navigate', { url: scenario.url });
      const deadline = Date.now() + 45000;
      let value;
      while (Date.now() < deadline) {
        try {
          const res = await tab.send('Runtime.evaluate', { expression: '({claim:window.__earlyTestClaim,error:window.__earlyTestError,bridge:!!window.Reclaim,installed:!!window.__earlySpotifyInstalled,url:location.href})', returnByValue: true });
          value = res.result?.value;
          if (value?.claim || value?.error) break;
        } catch { /* navigation replaced the execution context */ }
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      console.log(JSON.stringify({ platform: scenario.platform, bridgeStub: true, ...value }));
      if (!value?.claim) process.exitCode = 1;
    } finally {
      await tab.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
      if (scenario.platform === 'spotify') await tab.send('Network.setUserAgentOverride', { userAgent: '' });
    }
  }
} finally {
  await tab.send('Page.navigate', { url: 'https://myactivity.google.com/page?page=youtube_subscriptions' });
  await tab.close(); await browser.close();
}
process.exit(process.exitCode ?? 0);
