import type { Rule, RuleRoute } from "@/lib/early/model";
export type Campaign = { id: string; creator_wallet: string; definition: Rule };
export type Capability = { route: string; rewardReady: boolean; reason: string };
export type SupportRecord = { id: string; platform: string; activity: string; targetId: string; occurredAtMicros: string };
export function activityLabel(route: RuleRoute) {
  return route.route === "youtube_like" ? "Liked this video" : route.route === "youtube_subscription" ? "Subscribed to this channel" : route.targetId.startsWith("spotify:artist:") ? "Saved a track by this artist" : "Saved this track";
}
export function targetLink(route: RuleRoute) {
  if (route.route === "youtube_like") return `https://www.youtube.com/watch?v=${encodeURIComponent(route.targetId)}`;
  if (route.route === "youtube_subscription") return `https://www.youtube.com/channel/${encodeURIComponent(route.targetId)}`;
  const [, kind, id] = route.targetId.split(":");
  return `https://open.spotify.com/${kind === "artist" ? "artist" : "track"}/${encodeURIComponent(id)}`;
}
export function utcDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}
