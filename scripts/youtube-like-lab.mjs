// Explicitly authorized local source capture and proof experiment. No publication.
// Credentials remain in memory; selected proof artifacts stay in a private directory.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { youtubeLikeRecipe, youtubeLikeUserScript } from './youtube-like-recipe.mjs';
import { proofGeoLocation } from './provider-client-config.mjs';
const root = process.env.RECLAIM_AGENT_ROOT;
if (!root) throw new Error('Set RECLAIM_AGENT_ROOT to the installed authoring runtime.');
await access(`${root}/../zk-symmetric-crypto/resources/gnark`);
const load = file => import(pathToFileURL(`${root}/lib/${file}`).href);
const { connectCdp } = await load('cdp/client.js');
const { startCapture } = await load('cdp/capture.js');
const { runAttestorProof } = await load('proof/index.js');
const { splitSecrets, stripTransportHeaders, providers, hashProviderParams } = await load('provider/index.js');
const output = process.env.EARLY_PROVIDER_OUTPUT ?? '/private/tmp/early-youtube-like';
await mkdir(output, { recursive: true, mode: 0o700 });
const save = (name, value) => writeFile(`${output}/${name}.json`, JSON.stringify(value, null, 2), { mode: 0o600 });
const browser = await connectCdp(9222);
let capture;
try {
  const tabs = await browser.listTabs();
  const target = tabs.find(t => t.tabId === process.env.EARLY_CAPTURE_TAB) ?? tabs.find(t => t.url.startsWith('https://myactivity.google.com/'));
  if (!target) throw new Error('Open the signed-in My Activity tab.');
  const tab = await browser.attachToTab(target.tabId);
  capture = await startCapture(tab);
  const url = 'https://myactivity.google.com/page?page=youtube_likes&hl=en';
  await tab.send('Page.navigate', { url });
  let request;
  for (let i = 0; i < 180; i++) {
    request = [...capture.requests.values()].find(r => r.url === url && capture.bodies.get(r.requestId).available);
    if (request) break;
    await new Promise(r => setTimeout(r, 250));
  }
  if (!request) throw new Error('No completed likes response. Check Google sign-in.');
  const body = capture.bodies.get(request.requestId).body;
  const script = [...body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.startsWith("AF_initDataCallback({key: 'ds:3'"));
  if (!script) throw new Error('No English activity dataset.');
  const rows = JSON.parse(script.slice(script.indexOf('data:') + 5, script.lastIndexOf(', sideChannel:')))[0];
  const row = rows.find(r => r[9]?.[2] === 'Liked' && (!process.env.EARLY_VIDEO_ID || r[9][3] === `https://www.youtube.com/watch?v=${process.env.EARLY_VIDEO_ID}`));
  if (!row) throw new Error('Requested video not found in loaded likes.');
  const account = body.match(/"S06Grb":"(\d+)"/)?.[1];
  if (!account || row[5]?.length !== 100 || row[23]?.[0]?.length !== 48) throw new Error('Unexpected identity or activity framing.');
  const provider = { ...youtubeLikeRecipe({ timestamp: String(row[4]), videoId: row[9][3].split('v=')[1], channelId: row[32][0][3].split('/').at(-1) }), geoLocation: proofGeoLocation };
  const { secrets } = splitSecrets(stripTransportHeaders(request.requestHeaders));
  const logger = { trace() {}, debug() {}, info() {}, warn() {}, error() {}, child() { return this; } }, ctx = { version: 7 };
  const response = Buffer.from(`HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  const redacted = Buffer.from(response);
  console.log(JSON.stringify({stage:"raw-selector-check",matches:provider.responseRedactions.map(r=>new RegExp(r.regex.replace(/\{\{(\w+)\}\}/g,(_,k)=>provider.paramValues[k])).test(body)),tokenLengths:[row[5].length,row[23][0].length], rowLength:row.length, literalVideoUrl:body.includes(row[9][3]), escapedEquals:body.includes("watch?v"+String.fromCharCode(92)+"u003d"), encodedAmp:body.includes("watch?v&amp;")}));
  await save("selected-shape",row.map((v,i)=>i===5?"*".repeat(v.length):i===9?["title",null,v[2],v[3]]:i===23?["*".repeat(v[0].length),v[1]]:i===32?[[null,"channel",null,v[0][3]]]:v));
  for (const r of providers.http.getResponseRedactions({ response, params: provider, logger, ctx })) redacted.fill(42, r.fromIndex, r.toIndex);
  for (const token of [row[5], row[23][0]]) if (redacted.includes(Buffer.from(token))) throw new Error('Opaque activity token was not hidden.');
  const rawRequest = providers.http.createRequest({ headers: secrets }, provider, logger).data;
  await writeFile(`${output}/redacted-response.txt`, redacted, { mode: 0o600 });
  console.log(JSON.stringify({stage:'redaction-diagnostics',matches:provider.responseMatches.map(m=>m.type==='regex'?new RegExp(m.value).test(redacted.toString()):redacted.includes(Buffer.from(m.value))), rowLength:row.length, literalVideoUrl:body.includes(row[9][3]), escapedEquals:body.includes("watch?v"+String.fromCharCode(92)+"u003d"), encodedAmp:body.includes("watch?v&amp;")}));
  const local = await providers.http.assertValidProviderReceipt({ clientVersion: 7, ctx, logger, params: provider, receipt: [{ sender: 'client', message: Buffer.from(rawRequest) }, { sender: 'server', message: redacted }] });
  console.log(JSON.stringify({ stage: 'local-extraction', fields: Object.keys(local.extractedParameters), opaqueTokensHidden: true, recipeHash: hashProviderParams(provider) }));
  const anonymous = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const anon = await anonymous.text();
  if (anonymous.status === 200 && anon.includes(`"S06Grb":"${account}"`)) throw new Error('Anonymous identity not rejected.');
  console.log(JSON.stringify({ stage: 'anonymous-check', status: anonymous.status, rejected: true }));
  await save('provider', provider);
  await writeFile(`${output}/user-script.js`, youtubeLikeUserScript(), { mode: 0o600 });
  if (process.env.EARLY_CAPTURE_ONLY === 'true') process.exitCode = 0;
  else {
    const result = await runAttestorProof(provider, secrets, { includeAttestorClaim: true, zkEngine: 'gnark' });
    await save('result', result);
    console.log(JSON.stringify({ stage: 'proof', verified: result.verified, identifier: result.identifier, output }));
    if (!result.verified) process.exitCode = 1;
  }
} catch (error) {
  await save('private-error', { name: error.name, message: error.message });
  console.log(JSON.stringify({ stage: 'failed', detailsSavedPrivately: true, output })); process.exitCode = 1;
} finally { await capture?.stop(); await browser.close(); }
