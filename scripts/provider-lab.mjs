// Local authoring harness: credentials stay in memory; only selected proof data
// is written to the private output directory. Requires the installed Reclaim agent.
import { access, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { youtubeSubscriptionRecipe } from './provider-recipes.mjs';
import { proofGeoLocation } from './provider-client-config.mjs';

const root = process.env.RECLAIM_AGENT_ROOT;
if (!root) throw new Error('Set RECLAIM_AGENT_ROOT to the installed Reclaim agent directory.');
await access(`${root}/../zk-symmetric-crypto/resources/stwo`);
const load = (file) => import(pathToFileURL(`${root}/lib/${file}`).href);
const { connectCdp } = await load('cdp/client.js');
const { startCapture } = await load('cdp/capture.js');
const { draftProvider, splitSecrets, stripTransportHeaders, providers } = await load('provider/index.js');
const { runAttestorProof } = await load('proof/index.js');
const output = process.env.EARLY_PROVIDER_OUTPUT ?? '/private/tmp/early-provider-lab';
const boundEvent = process.env.EARLY_SELECTOR_ONLY !== 'true';
await mkdir(output, { recursive: true, mode: 0o700 });
const save = (name, value) => writeFile(`${output}/${name}.json`, JSON.stringify(value, null, 2), { mode: 0o600 });
const browser = await connectCdp(9222);
let capture;
let tab;
let proofVerified = false;
try {
  const tabs = await browser.listTabs();
  const target = tabs.find(t => t.tabId === process.env.EARLY_CAPTURE_TAB) ?? tabs.find(t => t.url.startsWith('https://myactivity.google.com/'));
  if (!target) throw new Error('Open the signed-in YouTube My Activity tab first.');
  tab = await browser.attachToTab(target.id ?? target.tabId);
  capture = await startCapture(tab);
  const url = 'https://myactivity.google.com/page?page=youtube_subscriptions';
  await tab.send('Page.navigate', { url });
  let request;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    request = [...capture.requests.values()].find(r => r.url === url && capture.bodies.get(r.requestId).available);
    if (request) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!request) throw new Error('No completed subscription response captured.');
  request.responseBody = capture.bodies.get(request.requestId).body;
  const script = [...request.responseBody.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]).find(s => s.startsWith("AF_initDataCallback({key: 'ds:3'"));
  if (!script) throw new Error('Subscription activity script absent; check login.');
  const rows = JSON.parse(script.slice(script.indexOf('data:') + 5, script.lastIndexOf(', sideChannel:')))[0];
  const selected = process.env.EARLY_CHANNEL_ID
    ? rows.find(row => row[9]?.[3] === `https://www.youtube.com/channel/${process.env.EARLY_CHANNEL_ID}`)
    : rows[0];
  if (!selected || selected[9]?.[2] !== 'Subscribed to') throw new Error('Requested subscription not in this response.');
  const account = request.responseBody.match(/"S06Grb":"(\d+)"/)?.[1];
  if (!account) throw new Error('Authenticated source account missing.');
  let { provider } = draftProvider(request, [
    { name: 'source_account_id', value: account },
    { name: 'activity_timestamp', value: String(selected[4]) },
    { name: 'target_channel_url', value: selected[9][3] },
  ], 'Early YouTube subscription repair', undefined, { shortenNames: false });
  provider.responseRedactions[0].xPath = '//script[@data-id="_gd"]';
  provider.responseRedactions[0].regex = '"S06Grb":"(?<source_account_id>\\d+)"';
  provider.responseMatches[0].value = '"S06Grb":"{{source_account_id}}"';
  provider.responseRedactions[1].xPath = '//script[@class="ds:3"]';
  provider.responseRedactions[2].xPath = '//script[@class="ds:3"]';
  provider.responseRedactions[2].regex = '"Subscribed to","(?<target_channel_url>https://www.youtube.com/channel/[^"\\\\]+)"';
  provider.responseMatches[2].value = '"Subscribed to","{{target_channel_url}}"';
  if (boundEvent) {
    if (selected[5].length !== 115) throw new Error('Unexpected event token framing.');
    provider = { ...provider, ...youtubeSubscriptionRecipe({ timestamp: String(selected[4]), channelId: selected[9][3].split('/').at(-1) }) };
  }
  if (process.env.EARLY_PROOF_GEO !== 'direct') provider.geoLocation = proofGeoLocation;
  // Selector-only mode is diagnostic and must never be used for eligibility.
  const { secrets } = splitSecrets(stripTransportHeaders(request.requestHeaders));
  if (boundEvent) {
    const logger = { trace() {}, debug() {}, info() {}, warn() {}, error() {}, child() { return this; } };
    const ctx = { version: 7 };
    const response = Buffer.from('HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ' + Buffer.byteLength(request.responseBody) + '\r\n\r\n' + request.responseBody);
    const redacted = Buffer.from(response);
    for (const range of providers.http.getResponseRedactions({ response, params: provider, logger, ctx })) {
      redacted.fill(42, range.fromIndex, range.toIndex);
    }
    if (redacted.includes(Buffer.from(selected[5]))) throw new Error('Opaque event token was not hidden.');
    const rawRequest = providers.http.createRequest({ headers: secrets }, provider, logger).data;
    const result = await providers.http.assertValidProviderReceipt({ clientVersion: 7, ctx, logger, params: provider,
      receipt: [{ sender: 'client', message: Buffer.from(rawRequest) }, { sender: 'server', message: redacted }] });
    console.log(JSON.stringify({ stage: 'local-attestor-validation', fields: Object.keys(result.extractedParameters), opaqueTokenHidden: true }));
  }
  const anonymous = await fetch(url, { redirect: 'manual' });
  const anonBody = await anonymous.text();
  const anonRejected = anonymous.status !== 200 || !anonBody.includes('"S06Grb":"' + account + '"');
  if (!anonRejected) throw new Error('Anonymous response contains the same source account.');
  await save('youtube-selector-repair-provider', provider);
  console.log(JSON.stringify({ stage: 'captured', status: request.status, anonymousStatus: anonymous.status, anonRejected, eventCount: rows.length }));
  const result = await runAttestorProof(provider, secrets, { includeAttestorClaim: true, zkEngine: process.env.EARLY_ZK_ENGINE ?? 'stwo' });
  proofVerified = result.verified === true;
  // SDK errors can embed an entire response; retain those locally, never print.
  await save('youtube-selector-repair-result', result);
  console.log(JSON.stringify({ stage: 'proof', verified: result.verified, identifier: result.identifier,
    error: result.error?.slice(0, 220), output }));
} finally {
  await capture?.stop();
  await tab?.close();
  await browser.close();
}
process.exit(proofVerified ? 0 : 1);
