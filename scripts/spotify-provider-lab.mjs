import { mkdir, writeFile, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { spotifyTrackRecipe } from './provider-recipes.mjs';
import { proofGeoLocation } from './provider-client-config.mjs';
const root = process.env.RECLAIM_AGENT_ROOT;
await access(`${root}/../zk-symmetric-crypto/resources/stwo`);
const load = p => import(pathToFileURL(`${root}/lib/${p}`).href);
const { connectCdp } = await load('cdp/client.js');
const { startCapture } = await load('cdp/capture.js');
const { splitSecrets, stripTransportHeaders } = await load('provider/index.js');
const { runAttestorProof } = await load('proof/index.js');
const output = process.env.EARLY_PROVIDER_OUTPUT ?? '/private/tmp/early-provider-lab';
await mkdir(output, { recursive: true, mode: 0o700 });
const save = (n, v) => writeFile(`${output}/${n}.json`, JSON.stringify(v, null, 2), { mode: 0o600 });
const browser = await connectCdp(9222);
let tab, capture;
let proofVerified = false;
try {
  const tabs = await browser.listTabs();
  const target = tabs.find(t => t.tabId === process.env.EARLY_CAPTURE_TAB);
  if (!target) throw new Error('Dedicated capture tab not available.');
  tab = await browser.attachToTab(target.tabId);
  capture = await startCapture(tab);
  await tab.send('Page.navigate', { url: 'https://open.spotify.com/collection/tracks' });
  let request;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    request = [...capture.requests.values()].find(r => r.graphqlOp === 'fetchPlaylist' && capture.bodies.get(r.requestId).available);
    if (request) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!request) throw new Error('No liked-songs request captured.');
  const originalBody = JSON.parse(request.requestBody);
  const offset = Number(process.env.EARLY_TRACK_OFFSET ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('Invalid offset.');
  const body = { ...originalBody, variables: { ...originalBody.variables, offset, limit: 1 } };
  const headers = stripTransportHeaders(request.requestHeaders);
  for (const key of Object.keys(headers)) if (['priority', 'cookie'].includes(key.toLowerCase())) delete headers[key];
  const replay = await tab.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true,
    expression: `(async()=>{const r=await fetch(${JSON.stringify(request.url)},{method:'POST',headers:${JSON.stringify(headers)},body:${JSON.stringify(JSON.stringify(body))},credentials:'include'});return {status:r.status,body:await r.text()};})()` });
  const value = replay.result?.value;
  if (value?.status !== 200) throw new Error(`Authenticated replay failed: ${value?.status ?? 'no response'}`);
  const p = JSON.parse(value.body).data?.playlistV2;
  if (p?.format !== 'liked-songs' || p.content.items.length !== 1) throw new Error('Expected one real liked-song item.');
  const provider = spotifyTrackRecipe({ collectionUri: body.variables.uri, offset });
  provider.geoLocation = proofGeoLocation;
  if (JSON.stringify(body) !== provider.body.replace('{{collection_uri}}', body.variables.uri).replace('{{offset}}', String(offset))) {
    throw new Error('Live Spotify request no longer matches the declared template.');
  }
  const { secrets, publics } = splitSecrets(headers);
  provider.headers = publics;
  const anonymous = await fetch(provider.url, { method: 'POST', headers: publics, body: JSON.stringify(body) });
  if (anonymous.status !== 401) throw new Error(`Unexpected anonymous status: ${anonymous.status}`);
  await save('spotify-generalized-provider', provider);
  console.log(JSON.stringify({ stage: 'replay', authenticated: 200, anonymous: 401, offset,
    track: p.content.items[0].itemV2.data.uri, artists: p.content.items[0].itemV2.data.artists.items.map(a => a.uri),
    canEdit: p.currentUserCapabilities.canEditItems, format: p.format }));
  const result = await runAttestorProof(provider, secrets, { includeAttestorClaim: true, zkEngine: 'gnark' });
  proofVerified = result.verified === true;
  await save(`spotify-generalized-${offset}-result`, result);
  console.log(JSON.stringify({ stage: 'proof', verified: result.verified, identifier: result.identifier, error: result.error?.slice(0, 200) }));
} finally {
  await capture?.stop(); await tab?.close(); await browser.close();
}
process.exit(proofVerified ? 0 : 1);
