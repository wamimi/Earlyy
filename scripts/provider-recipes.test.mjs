import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { youtubeSubscriptionRecipe, spotifyTrackRecipe } from './provider-recipes.mjs';
import { hashProofClaimParams } from '@reclaimprotocol/js-sdk';

const root = process.env.RECLAIM_AGENT_ROOT;
if (!root) throw new Error('Set RECLAIM_AGENT_ROOT to run the actual attestor extraction tests.');
await import(pathToFileURL(`${root}/lib/proof/index.js`).href);
const { providers, hashProviderParams } = await import(pathToFileURL(`${root}/lib/provider/index.js`).href);
const logger = { trace() {}, debug() {}, info() {}, warn() {}, error() {}, child() { return this; } };
const ctx = { version: 7 };
const a = 'UCaaaaaaaaaaaaaaaaaaaaaa';
const b = 'UCbbbbbbbbbbbbbbbbbbbbbb';
const first = '1700000000000000';
const second = '1750000000000000';
const opaque = 'X'.repeat(115);
function event(timestamp, channelId) {
  return [null, null, null, [26], Number(timestamp), opaque, null,
    ['YouTube', null, '//www.gstatic.com/images/branding/product/2x/youtube_2024_q4_24dp.png'], null,
    ['Example', null, 'Subscribed to', `https://www.youtube.com/channel/${channelId}`]];
}
const html = `<html><head><script>unrelated()</script><script data-id="_gd">window.WIZ_global_data={"S06Grb":"123456789012345678901"};</script></head><body><script>alsoUnrelated()</script><script class="ds:3">AF_initDataCallback({key: 'ds:3', data:${JSON.stringify([[event(first, a), event(second, b)]])}, sideChannel: {}});</script></body></html>`;
async function validate(timestamp, channelId) {
  const params = youtubeSubscriptionRecipe({ timestamp, channelId });
  const response = Buffer.from(`HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(html)}\r\n\r\n${html}`);
  const redacted = Buffer.from(response);
  for (const range of providers.http.getResponseRedactions({ response, params, logger, ctx })) redacted.fill(42, range.fromIndex, range.toIndex);
  assert.equal(redacted.includes(Buffer.from(opaque)), false);
  const request = providers.http.createRequest({ headers: {} }, params, logger).data;
  return providers.http.assertValidProviderReceipt({ params, logger, ctx, clientVersion: 7,
    receipt: [{ sender: 'client', message: Buffer.from(request) }, { sender: 'server', message: redacted }] });
}
test('selects the first event with stable script anchors and hides its token', async () => {
  const result = await validate(first, a);
  assert.equal(result.extractedParameters.activity_timestamp, first);
  assert.equal(result.extractedParameters.channel_id, a);
});
test('selects another event with the identical recipe', async () => {
  assert.equal((await validate(second, b)).extractedParameters.channel_id, b);
});
test('cannot combine an early date with another event’s channel', async () => {
  await assert.rejects(validate(first, b));
  await assert.rejects(validate(second, a));
});
test('rejects a date absent from the source response', async () => {
  await assert.rejects(validate('1600000000000000', a));
});
test('rejects regex injection through selection parameters', () => {
  assert.throws(() => youtubeSubscriptionRecipe({ timestamp: '.*', channelId: a }));
  assert.throws(() => youtubeSubscriptionRecipe({ timestamp: first, channelId: '.*' }));
});
test('SDK hash includes every selector and agrees with the attestor', () => {
  for (const recipe of [youtubeSubscriptionRecipe({ timestamp: first, channelId: a }),
    spotifyTrackRecipe({ collectionUri: 'spotify:playlist:0000000000000000000000', offset: 40 })]) {
    assert.equal(recipe.responseMatches.length, recipe.responseRedactions.length);
    assert.ok(hashProofClaimParams(recipe).includes(hashProviderParams(recipe)));
  }
});
test('changing the selected event or collection does not change the declared recipe hash', () => {
  assert.equal(hashProviderParams(youtubeSubscriptionRecipe({ timestamp: first, channelId: a })),
    hashProviderParams(youtubeSubscriptionRecipe({ timestamp: second, channelId: b })));
  assert.equal(hashProviderParams(spotifyTrackRecipe({ collectionUri: 'spotify:playlist:0000000000000000000000', offset: 0 })),
    hashProviderParams(spotifyTrackRecipe({ collectionUri: 'spotify:playlist:1111111111111111111111', offset: 40 })));
});
test('Spotify reveals one intact item through its parent without exposing another item', () => {
  const params = spotifyTrackRecipe({ collectionUri: 'spotify:playlist:0000000000000000000000', offset: 0 });
  const selected = { addedAt: { isoString: '2025-01-01T00:00:00Z' }, itemV2: { data: { name: 'Música 🎵', uri: 'spotify:track:example' } }, uid: 'event1' };
  const other = { addedAt: { isoString: '2026-01-01T00:00:00Z' }, itemV2: { data: { name: 'Private other song', uri: 'spotify:track:other' } }, uid: 'event2' };
  const body = JSON.stringify({ before: 'é 🎵', data: { playlistV2: { content: { items: [selected, other] }, ownerV2: { data: { uri: 'spotify:user:example' } }, format: 'liked-songs', currentUserCapabilities: { canEditItems: true } } } });
  const response = Buffer.from(`HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  const redacted = Buffer.from(response);
  for (const range of providers.http.getResponseRedactions({ response, params, logger, ctx })) redacted.fill(42, range.fromIndex, range.toIndex);
  assert.ok(redacted.includes(Buffer.from(JSON.stringify(selected))));
  assert.equal(redacted.includes(Buffer.from('Private other song')), false);
  const request = providers.http.createRequest({ headers: {} }, params, logger).data;
  const result = providers.http.assertValidProviderReceipt({ params, logger, ctx, clientVersion: 7, receipt: [{ sender: 'client', message: Buffer.from(request) }, { sender: 'server', message: redacted }] });
  assert.deepEqual(JSON.parse(result.extractedParameters.saved_item), selected);
  assert.equal(params.responseRedactions[0].jsonPath, '$.data.playlistV2.content');
});
