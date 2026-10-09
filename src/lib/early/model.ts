import { getAddress, keccak256, toUtf8Bytes } from "ethers";
import type { EarlyActivity } from "../activity-evidence";
import { EarlyError, ensure } from "./errors";

export const routeIds = ["spotify_saved_track", "youtube_subscription"] as const;
export type RouteId = typeof routeIds[number];
export type RuleRoute = {
  route: RouteId;
  targetId: string;
  cutoff: string;
};
export type Rule = {
  version: number;
  title: string;
  alternatives: RuleRoute[];
  minimumDistinctEvents: number;
  minimumDistinctDays: number;
  payoutWei: string;
  capacity: number;
  claimExpiry: number;
};
export type Evidence = EarlyActivity & {
  id: string;
  route: RouteId;
  providerId: string;
  providerVersion: string;
  recipeHash: string;
  provedAt: string;
  observedAt: string;
  coverage: "selected_saved_item" | "loaded_english_activity_page";
};
export type Evaluation = {
  status: "eligible" | "not_qualifying" | "indeterminate" | "awaiting_proof" | "technical_failure";
  evidenceIds: string[];
  reason: string;
};

export function record(value: unknown): Record<string, unknown> {
  ensure(value && typeof value === "object" && !Array.isArray(value), "INVALID_INPUT", "Expected an object.");
  return value as Record<string, unknown>;
}
export function string(value: unknown, max = 200): string {
  ensure(typeof value === "string" && value.length > 0 && value.length <= max, "INVALID_INPUT", "Invalid text value.");
  return value;
}
export function uint(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  ensure(typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= max, "INVALID_INPUT", "Expected a positive integer.");
  return value;
}
export function wallet(value: unknown) {
  let result: string;
  try { result = getAddress(string(value, 42)); }
  catch { throw new EarlyError("INVALID_WALLET", "Use a valid Ethereum wallet address."); }
  ensure(result !== "0x0000000000000000000000000000000000000000", "INVALID_INPUT", "Wallet cannot be zero.");
  return result;
}
export function utcMicros(value: unknown): bigint {
  const s = string(value, 40);
  ensure(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s), "INVALID_CUTOFF", "Use an explicit UTC timestamp ending in Z.");
  const ms = Date.parse(s);
  ensure(Number.isFinite(ms) && (new Date(ms).toISOString() === s || new Date(ms).toISOString().replace(".000Z", "Z") === s), "INVALID_CUTOFF", "Invalid calendar date.");
  return BigInt(ms) * BigInt(1000);
}
export function parseRoute(value: unknown): RuleRoute {
  const r = record(value);
  ensure(routeIds.includes(r.route as RouteId), "UNSUPPORTED_ROUTE", "This activity route is not available.");
  const route = r.route as RouteId;
  const targetId = string(r.targetId);
  ensure(route === "spotify_saved_track" ? /^spotify:(track|artist):[A-Za-z0-9]{22}$/.test(targetId) : /^UC[A-Za-z0-9_-]{22}$/.test(targetId), "INVALID_TARGET", "Invalid platform target ID.");
  utcMicros(r.cutoff);
  return { route, targetId, cutoff: new Date(string(r.cutoff)).toISOString() };
}
export function parseRule(value: unknown): Rule {
  const r = record(value);
  const version = uint(r.version, 2147483647);
  ensure(Array.isArray(r.alternatives) && r.alternatives.length > 0 && r.alternatives.length <= 8, "INVALID_ROUTES", "Choose between one and eight alternative routes.");
  const payoutWei = string(r.payoutWei, 78);
  ensure(/^[1-9]\d*$/.test(payoutWei), "INVALID_AMOUNT", "Payout must be a positive integer in wei.");
  const capacity = uint(r.capacity, 1000000);
  ensure(BigInt(payoutWei) * BigInt(capacity) < BigInt(2) ** BigInt(256), "INVALID_AMOUNT", "Funding exceeds uint256.");
  const minimumDistinctEvents = uint(r.minimumDistinctEvents ?? 1, 100);
  const minimumDistinctDays = uint(r.minimumDistinctDays ?? 1, 100);
  ensure(minimumDistinctDays <= minimumDistinctEvents, "INVALID_REPEAT_RULE", "Distinct days cannot exceed required events.");
  const title = string(r.title, 100).trim();
  ensure(title.length > 0, "INVALID_TITLE", "A rule name is required.");
  return { version, title, alternatives: r.alternatives.map(parseRoute),
    minimumDistinctEvents, minimumDistinctDays, payoutWei, capacity, claimExpiry: uint(r.claimExpiry, 253402300799) };
}
export function ruleCommitment(rule: Rule) {
  return keccak256(toUtf8Bytes(JSON.stringify(parseRule(rule))));
}

export function evaluate(rule: Rule, evidence: Evidence[]): Evaluation {
  const unique = new Map(evidence.map(e => [e.eventId, e]));
  const qualifying: Evidence[] = [];
  let overlaps = false;
  for (const e of unique.values()) {
    let qualifies = false;
    for (const r of rule.alternatives) {
      if (e.route !== r.route || (e.targetId !== r.targetId && !e.artistIds.includes(r.targetId))) continue;
      const start = BigInt(e.occurredAtMicros), end = start + BigInt(e.precisionMicros), cutoff = utcMicros(r.cutoff);
      if (end <= cutoff) qualifies = true;
      else if (start < cutoff) overlaps = true;
    }
    if (qualifies) qualifying.push(e);
  }
  const days = new Set(qualifying.map(e => (BigInt(e.occurredAtMicros) / BigInt(86400000000)).toString()));
  if (qualifying.length >= rule.minimumDistinctEvents && days.size >= rule.minimumDistinctDays)
    return { status: "eligible", evidenceIds: qualifying.map(e => e.id), reason: "Verified activity satisfies this rule." };
  if (overlaps) return { status: "indeterminate", evidenceIds: [], reason: "Source timestamp precision overlaps the cutoff." };
  return { status: evidence.length ? "not_qualifying" : "awaiting_proof", evidenceIds: [], reason: evidence.length ? "These records do not satisfy this rule; incomplete coverage does not establish absence of other activity." : "Choose an accepted activity to verify." };
}
