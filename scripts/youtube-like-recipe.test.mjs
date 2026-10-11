import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { hashProofClaimParams } from '@reclaimprotocol/js-sdk';
import { youtubeLikeRecipe } from './youtube-like-recipe.mjs';
const root = process.env.RECLAIM_AGENT_ROOT;
if (!root) throw new Error('Set RECLAIM_AGENT_ROOT.');
await import(pathToFileURL(`${root}/lib/proof/index.js`).href);
const { providers, hashProviderParams } = await import(pathToFileURL(`${root}/lib/provider/index.js`).href);
const logger = { trace() {}, debug() {}, info() {}, warn() {}, error() {}, child() { return this; } }, ctx = { version: 7 };
const first = { timestamp: '1700000000000000', videoId: 'aaaaaaaaaaa', channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa' };
const second = { timestamp: '1750000000000000', videoId: 'bbbbbbbbbbb', channelId: 'UCbbbbbbbbbbbbbbbbbbbbbb' };
function event(s, action = 'Liked') {
  return [null,null,null,[26],Number(s.timestamp),'X'.repeat(100),null,['YouTube',null,'//www.gstatic.com/images/branding/product/2x/youtube_2024_q4_24dp.png'],null,['A title 🎵',null,action,`https://www.youtube.com/watch?v=${s.videoId}`],null,null,null,null,null,null,null,[''],null,null,null,null,null,['Y'.repeat(48),'3:20'],null,null,null,[[1000]],[[26,'YouTube']],null,null,null,[[null,'Channel',null,`https://www.youtube.com/channel/${s.channelId}`]]];
}
async function validate(selection, rows = [event(first), event(second)]) {
  const params = youtubeLikeRecipe(selection);
  const html = `<html><script data-id="_gd">window.WIZ_global_data={"S06Grb":"123456789012345678901"};</script><script class="ds:3">AF_initDataCallback({key: 'ds:3', data:${JSON.stringify([rows]).replaceAll("watch?v=", "watch?v"+String.fromCharCode(92)+"u003d")}, sideChannel: {}});</script></html>`;
  const response = Buffer.from(`HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(html)}\r\n\r\n${html}`), redacted = Buffer.from(response);
  for (const r of providers.http.getResponseRedactions({ response, params, logger, ctx })) redacted.fill(42,r.fromIndex,r.toIndex);
  assert.equal(redacted.includes(Buffer.from('X'.repeat(100))),false);
  assert.equal(redacted.includes(Buffer.from('Y'.repeat(48))),false);
  const request = providers.http.createRequest({ headers: {} },params,logger).data;
  return providers.http.assertValidProviderReceipt({ clientVersion: 7, ctx, logger, params, receipt:[{sender:'client',message:Buffer.from(request)},{sender:'server',message:redacted}] });
}
test('binds date, action, video and channel in one event with opaque tokens hidden', async () => {
  for (const s of [first,second]) assert.deepEqual((await validate(s)).extractedParameters,{source_account_id:'123456789012345678901',activity_timestamp:s.timestamp,video_id:s.videoId,channel_id:s.channelId});
});
test('rejects mixing date, video or channel across records', async () => {
  for (const field of ['timestamp','videoId','channelId']) await assert.rejects(validate({...first,[field]:second[field]}));
});
test('does not treat watched, disliked or searched records as likes', async () => {
  for (const action of ['Watched','Disliked','Searched for']) await assert.rejects(validate(first,[event(first,action)]));
});
test('fails closed on altered source framing and nonexistent dates', async () => {
  const row = event(first);row[5] = 'X'.repeat(99);await assert.rejects(validate(first,[row]));
  await assert.rejects(validate({...first,timestamp:'1600000000000000'}));
});
test('all redactions are pinned and selection values do not alter the hash', () => {
  const a=youtubeLikeRecipe(first), b=youtubeLikeRecipe(second);
  assert.equal(a.responseMatches.length,a.responseRedactions.length);
  assert.ok(hashProofClaimParams(a).includes(hashProviderParams(a)));
  assert.equal(hashProviderParams(a),hashProviderParams(b));
  for(let i=0;i<a.responseRedactions.length;i++){const changed=structuredClone(a);changed.responseRedactions[i].regex+='.';assert.notEqual(hashProviderParams(changed),hashProviderParams(a));}
});
test('rejects selector injection', () => { for (const field of ['timestamp','videoId','channelId']) assert.throws(()=>youtubeLikeRecipe({...first,[field]:'.*'})); });
