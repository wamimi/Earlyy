import { afterEach, expect, it, vi } from "vitest";
import { parseTargetLink, resolveSupportTarget } from "../src/lib/early/targets";
import { proofStatusText } from "../src/lib/early/proof-status";
const id = "UCEBb1b_L6zDS3xTUrIALZOw";
afterEach(() => vi.unstubAllGlobals());
it("normalizes Spotify share links without their tracking query", () => {
  expect(parseTargetLink("spotify_saved_track", "https://open.spotify.com/track/5jDH3DncHm4ZTl9sKX5dDJ?si=private")).toMatchObject({ targetId: "spotify:track:5jDH3DncHm4ZTl9sKX5dDJ", url: "https://open.spotify.com/track/5jDH3DncHm4ZTl9sKX5dDJ" });
  expect(parseTargetLink("spotify_saved_track", "https://open.spotify.com/intl-fr/artist/6ZySbCCkS4CgURXpC9tuCR")).toMatchObject({ targetId: "spotify:artist:6ZySbCCkS4CgURXpC9tuCR" });
});
it("resolves handles from channel metadata, not a recommended video's channel", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => new Response(`{"channelId":"UC${"z".repeat(22)}","channelMetadataRenderer":{"title":"MIT OpenCourseWare","description":"Public courses","externalId":"${id}","channelUrl":"https://www.youtube.com/channel/${id}"}}`));
  vi.stubGlobal("fetch", fetcher);
  expect(await resolveSupportTarget("youtube_subscription", "https://www.youtube.com/@mitocw/videos?si=tracking")).toEqual({ targetId: id, label: "MIT OpenCourseWare", url: `https://www.youtube.com/channel/${id}` });
  expect(fetcher.mock.calls[0][0]).toBe("https://www.youtube.com/@mitocw");
});
it.each(["https://youtube.com.evil.test/@mitocw", "https://youtube.com@127.0.0.1/@mitocw", "http://www.youtube.com/@mitocw", "https://www.youtube.com:444/@mitocw", "https://www.youtube.com/watch?v=anything"])("rejects unsafe or non-channel target %s before fetching", async link => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(resolveSupportTarget("youtube_subscription", link)).rejects.toThrow(); expect(fetcher).not.toHaveBeenCalled();
});
it("fails a handle lookup explicitly without guessing a target", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response('{"channelId":"wrong-recommendation"}')));
  await expect(resolveSupportTarget("youtube_subscription", "https://www.youtube.com/@mitocw")).rejects.toMatchObject({ code: "TARGET_LOOKUP_FAILED" });
});
it("does not fetch for an explicit channel ID or channel URL", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect(await resolveSupportTarget("youtube_subscription", `https://www.youtube.com/channel/${id}/videos`)).toMatchObject({ targetId: id });
  expect(fetcher).not.toHaveBeenCalled();
});
it("never presents technical failure as ineligibility or a saved record as a reward", () => {
  expect(proofStatusText("technical_failure")).toContain("not a decision");
  expect(proofStatusText("verified")).toContain("campaign must accept");
});
