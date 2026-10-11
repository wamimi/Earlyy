/** Normalize only fields returned by successful strict Reclaim verification. */
export type EarlyActivity = {
  platform: "spotify" | "youtube";
  activity: "track_saved" | "channel_subscribed" | "video_liked";
  sourceSubject: string;
  targetId: string;
  artistIds: string[];
  channelId?: string;
  occurredAtMicros: string;
  precisionMicros: 1 | 1000000;
  eventId: string;
};

function text(value: unknown, pattern: RegExp, name: string) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(`Invalid verified ${name}.`);
  return value;
}

export function spotifySavedTrackEvidence(fields: Record<string, unknown>): EarlyActivity {
  const owner = text(fields.collection_owner, /^spotify:user:[A-Za-z0-9._~%-]+$/, "collection owner");
  const raw = text(fields.saved_item, /^\{[\s\S]*\}$/, "saved item");
  const item = JSON.parse(raw);
  if (item.addedBy?.data?.uri !== owner) throw new Error("Saved item does not belong to the verified collection owner.");
  const track = item.itemV2?.data;
  if (track?.__typename !== "Track") throw new Error("The saved item is not a track.");
  const targetId = text(track.uri, /^spotify:track:[A-Za-z0-9]{22}$/, "track");
  const savedAt = text(item.addedAt?.isoString, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, "save date");
  const millis = Date.parse(savedAt);
  if (!Number.isFinite(millis) || new Date(millis).toISOString().replace(".000Z", "Z") !== savedAt) throw new Error("Invalid save date.");
  if (!Array.isArray(track.artists?.items) || !track.artists.items.length) throw new Error("Track artists missing.");
  const artistIds = [...new Set<string>(track.artists.items.map((a: { uri?: unknown }) =>
    text(a.uri, /^spotify:artist:[A-Za-z0-9]{22}$/, "track artist")))];
  const occurredAtMicros = (BigInt(millis) * BigInt(1000)).toString();
  return { platform: "spotify", activity: "track_saved", sourceSubject: owner,
    targetId, artistIds, occurredAtMicros, precisionMicros: 1000000,
    eventId: JSON.stringify(["spotify", owner, "track_saved", targetId, occurredAtMicros]) };
}

export function youtubeSubscriptionEvidence(fields: Record<string, unknown>): EarlyActivity {
  const sourceSubject = text(fields.source_account_id, /^\d+$/, "source account");
  const targetId = text(fields.channel_id, /^UC[A-Za-z0-9_-]{22}$/, "channel");
  const occurredAtMicros = text(fields.activity_timestamp, /^\d{16}$/, "subscription date");
  return { platform: "youtube", activity: "channel_subscribed", sourceSubject,
    targetId, artistIds: [], occurredAtMicros, precisionMicros: 1,
    eventId: JSON.stringify(["youtube", sourceSubject, "channel_subscribed", targetId, occurredAtMicros]) };
}

/** All four fields must come from the reviewed, same-event signed extraction. */
export function youtubeLikeEvidence(fields: Record<string, unknown>): EarlyActivity {
  const sourceSubject = text(fields.source_account_id, /^\d+$/, "source account");
  const targetId = text(fields.video_id, /^[A-Za-z0-9_-]{11}$/, "video");
  const channelId = text(fields.channel_id, /^UC[A-Za-z0-9_-]{22}$/, "video channel");
  const occurredAtMicros = text(fields.activity_timestamp, /^\d{16}$/, "like date");
  return { platform: "youtube", activity: "video_liked", sourceSubject,
    targetId, channelId, artistIds: [], occurredAtMicros, precisionMicros: 1,
    eventId: JSON.stringify(["youtube", sourceSubject, "video_liked", targetId, occurredAtMicros]) };
}

export type EarlyActivityRule = {
  platform: EarlyActivity["platform"];
  acceptedActivities: EarlyActivity["activity"][];
  targetId: string;
  cutoff: string;
};

/** A creator's alternatives are OR; proving one qualifying route is enough. */
export function qualifiesThroughAnyRoute(evidence: EarlyActivity[], rules: EarlyActivityRule[]) {
  return rules.some(rule => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(rule.cutoff)) throw new Error("Cutoff must be an explicit UTC timestamp.");
    const cutoff = Date.parse(rule.cutoff);
    if (!Number.isFinite(cutoff)) throw new Error("Invalid cutoff.");
    const canonicalCutoff = new Date(cutoff).toISOString();
    if (canonicalCutoff !== rule.cutoff && canonicalCutoff.replace(".000Z", "Z") !== rule.cutoff) throw new Error("Invalid cutoff calendar date.");
    return evidence.some(event => event.platform === rule.platform
      && rule.acceptedActivities.includes(event.activity)
      && (event.targetId === rule.targetId || event.artistIds.includes(rule.targetId))
      // A cutoff inside the source timestamp's precision interval is not
      // sufficient evidence of early support.
      && BigInt(event.occurredAtMicros) + BigInt(event.precisionMicros) <= BigInt(cutoff) * BigInt(1000));
  });
}
