import { expect, it, vi } from 'vitest';
import vm from 'node:vm';
import { spotifyTrackUserScript, youtubeSubscriptionUserScript } from '../scripts/provider-recipes.mjs';
import { proofGeoLocation, spotifyUserAgent, injectedRequestsForPublication } from '../scripts/provider-client-config.mjs';

const channel = 'UCEBb1b_L6zDS3xTUrIALZOw';
function runtime(script, hostname, parameters = {}, html = '') {
  const intervals = [];
  const bridge = { parameters, requestClaim: vi.fn(async () => null), canExpectManyClaims: vi.fn(), reportProviderError: vi.fn(), log: vi.fn() };
  const location = { hostname, pathname: '/collection/tracks', assign: vi.fn() };
  const document = { querySelector: vi.fn(selector => selector.startsWith('script.') ? { textContent: html } : null) };
  const originalFetch = vi.fn();
  const window = { Reclaim: bridge, fetch: originalFetch };
  vm.runInNewContext(script, { window, location, document, setInterval: fn => { intervals.push(fn); return intervals.length; }, clearInterval: vi.fn(), Request, Headers, Date, JSON });
  return { window, bridge, location, document, intervals, originalFetch };
}
function subscription(timestamp = 1756924713432194, id = channel) {
  const row = [null, null, null, [26], timestamp, 'x'.repeat(115), null, null, null, ['MIT OpenCourseWare', null, 'Subscribed to', `https://www.youtube.com/channel/${id}`]];
  return `AF_initDataCallback({key: 'ds:3', data:${JSON.stringify([[row]])}, sideChannel: {}});`;
}
it('does not cancel a native YouTube claim merely because the bridge returns null', async () => {
  const r = runtime(youtubeSubscriptionUserScript(), 'myactivity.google.com', { channel_id: channel, cutoff: '2026-10-10T18:08:24.255Z' }, subscription());
  await r.intervals[0]();
  expect(r.bridge.requestClaim).toHaveBeenCalledOnce();
  expect(r.bridge.requestClaim.mock.calls[0][0].witnessParameters).toEqual({ selected_timestamp: '1756924713432194', selected_channel_id: channel });
  expect(r.bridge.reportProviderError).not.toHaveBeenCalled();
  expect(r.bridge.canExpectManyClaims).toHaveBeenLastCalledWith(false);
});
it.each([{ channel_id: `UC${'a'.repeat(22)}` }, { channel_id: channel, cutoff: '2020-01-01T00:00:00Z' }])('never submits another channel or an after-cutoff event: %j', async parameters => {
  const r = runtime(youtubeSubscriptionUserScript(), 'myactivity.google.com', parameters, subscription());
  await r.intervals[0]();
  expect(r.bridge.requestClaim).not.toHaveBeenCalled();
  expect(r.bridge.reportProviderError).toHaveBeenCalledOnce();
});
it('returns to Spotify Liked Songs only after detecting the signed-in profile', () => {
  const r = runtime(spotifyTrackUserScript(), 'open.spotify.com');
  r.location.pathname = '/artist/example'; r.intervals[0]();
  expect(r.location.assign).not.toHaveBeenCalled();
  r.document.querySelector.mockReturnValue({}); r.intervals[0]();
  expect(r.location.assign).toHaveBeenCalledWith('https://open.spotify.com/collection/tracks');
  r.location.pathname = '/collection/tracks'; r.location.assign.mockClear(); r.intervals[0]();
  expect(r.location.assign).not.toHaveBeenCalled();
});
it('queues one Spotify item without a false provider error when the native bridge returns null', async () => {
  const track = '5jDH3DncHm4ZTl9sKX5dDJ';
  const r = runtime(spotifyTrackUserScript(), 'open.spotify.com', { track_id: track });
  const data = { data: { playlistV2: { format: 'liked-songs', content: { totalCount: 1, items: [{ addedAt: { isoString: '2025-01-01T00:00:00Z' }, itemV2: { data: { __typename: 'Track', uri: `spotify:track:${track}` } } }] } } } };
  r.originalFetch.mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
  await r.window.fetch('https://api-partner.spotify.com/pathfinder/v2/query', { body: JSON.stringify({ operationName: 'fetchPlaylist', variables: { uri: `spotify:playlist:${'a'.repeat(22)}`, offset: 0 }, extensions: { persistedQuery: { sha256Hash: '8964e8eafb21aa992a7d951d256d83285c04be2105d209262901de70cb97584a' } } }) });
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(r.bridge.requestClaim).toHaveBeenCalledOnce();
  expect(r.bridge.reportProviderError).not.toHaveBeenCalled();
});
it('publishes concrete proof routing and a desktop web layout on both mobile platforms', () => {
  expect(proofGeoLocation).toMatch(/^[A-Z]{2}$/);
  expect(spotifyUserAgent.android).not.toMatch(/Android|Mobile/);
  expect(spotifyUserAgent.ios).not.toMatch(/iPhone|Mobile/);
});
it('preserves the signed request body template when translating published configs to MCP input', () => {
  const requests = injectedRequestsForPublication([{ url: 'https://example.com', bodySniff: { enabled: true, template: '{"offset":{{offset}}}' } }]);
  expect(requests[0].body).toBe('{"offset":{{offset}}}');
});
