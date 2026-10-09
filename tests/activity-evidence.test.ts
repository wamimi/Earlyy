import { describe, expect, it } from "vitest";
import { qualifiesThroughAnyRoute, spotifySavedTrackEvidence, youtubeSubscriptionEvidence } from "../src/lib/activity-evidence";

const artist = "spotify:artist:" + "a".repeat(22);
const albumArtist = "spotify:artist:" + "b".repeat(22);
const track = "spotify:track:" + "t".repeat(22);
const channel = "UC" + "c".repeat(22);
function fields() {
  return { collection_owner: "spotify:user:sample", saved_item: JSON.stringify({
    addedAt: { isoString: "2026-01-01T00:00:00Z" }, addedBy: { data: { uri: "spotify:user:sample" } },
    itemV2: { data: { __typename: "Track", uri: track, artists: { items: [{ uri: artist }] },
      albumOfTrack: { artists: { items: [{ uri: albumArtist }] } } } }, uid: "example",
  }) };
}
describe("verified early activity", () => {
  it("expands a track to its actual artists, not the album artists", () => {
    expect(spotifySavedTrackEvidence(fields()).artistIds).toEqual([artist]);
  });
  it("rejects a saved item from another collection owner", () => {
    expect(() => spotifySavedTrackEvidence({ ...fields(), collection_owner: "spotify:user:other" })).toThrow(/owner/);
  });
  it("rejects an invalid calendar date", () => {
    const f = fields(); f.saved_item = f.saved_item.replace("2026-01-01", "2026-02-30");
    expect(() => spotifySavedTrackEvidence(f)).toThrow(/date/);
  });
  it("qualifies through one alternative without requiring every activity", () => {
    const e = spotifySavedTrackEvidence(fields());
    expect(qualifiesThroughAnyRoute([e], [
      { platform: "youtube", acceptedActivities: ["channel_subscribed"], targetId: channel, cutoff: "2026-02-01T00:00:00Z" },
      { platform: "spotify", acceptedActivities: ["track_saved"], targetId: artist, cutoff: "2026-02-01T00:00:00Z" },
    ])).toBe(true);
  });
  it("rejects the wrong target and the exact cutoff boundary", () => {
    const e = spotifySavedTrackEvidence(fields());
    expect(qualifiesThroughAnyRoute([e], [{ platform: "spotify", acceptedActivities: ["track_saved"], targetId: albumArtist, cutoff: "2026-02-01T00:00:00Z" }])).toBe(false);
    expect(qualifiesThroughAnyRoute([e], [{ platform: "spotify", acceptedActivities: ["track_saved"], targetId: track, cutoff: "2026-01-01T00:00:00Z" }])).toBe(false);
  });
  it("preserves YouTube microsecond precision at a cutoff", () => {
    const e = youtubeSubscriptionEvidence({ source_account_id: "123", channel_id: channel,
      activity_timestamp: (BigInt(Date.parse("2026-01-01T00:00:00Z")) * BigInt(1000) - BigInt(1)).toString() });
    expect(qualifiesThroughAnyRoute([e], [{ platform: "youtube", acceptedActivities: ["channel_subscribed"], targetId: channel, cutoff: "2026-01-01T00:00:00Z" }])).toBe(true);
  });
  it("does not approve when a cutoff overlaps Spotify's one-second precision", () => {
    expect(qualifiesThroughAnyRoute([spotifySavedTrackEvidence(fields())], [{ platform: "spotify",
      acceptedActivities: ["track_saved"], targetId: track, cutoff: "2026-01-01T00:00:00.001Z" }])).toBe(false);
  });
  it("rejects an impossible cutoff calendar date", () => {
    expect(() => qualifiesThroughAnyRoute([spotifySavedTrackEvidence(fields())], [{ platform: "spotify",
      acceptedActivities: ["track_saved"], targetId: track, cutoff: "2026-02-30T00:00:00Z" }])).toThrow(/calendar/);
  });
  it("gives repeat submissions of one event the same event identifier", () => {
    expect(spotifySavedTrackEvidence(fields()).eventId).toBe(spotifySavedTrackEvidence(fields()).eventId);
  });
});
