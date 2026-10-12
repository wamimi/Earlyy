import { describe, it, expect, vi } from "vitest";
import { evaluate, parseRule, parseRoute, utcMicros, ruleCommitment, type Evidence, type Rule } from "../src/lib/early/model";
import { inspectAlternatives } from "../src/lib/early/orchestration";
import { eventKey, sourceKey, sourceNullifier } from "../src/lib/early/nullifiers";
import { capabilities } from "../src/lib/early/providers";

export const spotifyTarget = `spotify:track:${"a".repeat(22)}`;
export const channel = `UC${"b".repeat(22)}`;
export const rule: Rule = { version: 1, title: "Early support", alternatives: [
  { route: "spotify_saved_track", targetId: spotifyTarget, cutoff: "2025-01-01T00:00:00.000Z" },
  { route: "youtube_subscription", targetId: channel, cutoff: "2025-01-01T00:00:00.000Z" }],
  minimumDistinctEvents: 1, minimumDistinctDays: 1, payoutWei: "100", capacity: 2, claimExpiry: 2000000000 };
export function evidence(patch: Partial<Evidence> = {}): Evidence {
  return { id: "event-a", platform: "spotify", activity: "track_saved", sourceSubject: "spotify:user:test", targetId: spotifyTarget,
    artistIds: [], occurredAtMicros: utcMicros("2024-01-01T00:00:00Z").toString(), precisionMicros: 1000000,
    eventId: "source-event-a", route: "spotify_saved_track", providerId: "test", providerVersion: "1", recipeHash: "test", provedAt: "2026-01-01T00:00:00Z",
    observedAt: "2026-01-01T00:00:00Z", coverage: "selected_saved_item", ...patch };
}
describe("eligibility semantics", () => {
  it("accepts the second OR route when the first candidate is late", async () => {
    const first = evidence({ occurredAtMicros: utcMicros("2025-02-01T00:00:00Z").toString() });
    const second = evidence({ id: "event-b", eventId: "event-b", platform: "youtube", activity: "channel_subscribed", route: "youtube_subscription", targetId: channel });
    const adapter = { inspect: vi.fn(async () => ({ status: "candidates" as const, candidates: [{ id: "one", label: "Activity" }] })),
      prove: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second) };
    const result = await inspectAlternatives(rule, adapter, async () => "one");
    expect(result.evaluation.status).toBe("eligible");expect(adapter.prove).toHaveBeenCalledTimes(2);
  });
  it("stops collection after sufficient evidence", async () => {
    const adapter = { inspect: vi.fn(async () => ({ status: "candidates" as const, candidates: [{ id: "one", label: "Activity" }] })), prove: vi.fn(async () => evidence()) };
    expect((await inspectAlternatives(rule,adapter,async () => "one")).evaluation.status).toBe("eligible");
    expect(adapter.inspect).toHaveBeenCalledTimes(1);
  });
  it("does not convert source errors into ineligibility and can recover via an alternative", async () => {
    const broken = { inspect: vi.fn(async () => {throw new Error("source unavailable");}), prove: vi.fn() };
    expect((await inspectAlternatives(rule,broken,async () => null)).evaluation.status).toBe("technical_failure");
    const adapter = { inspect: vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({status:"candidates",candidates:[{id:"b",label:"Second"}]}),
      prove: vi.fn(async () => evidence({route:"youtube_subscription",targetId:channel})) };
    expect((await inspectAlternatives(rule,adapter,async()=>"b")).evaluation.status).toBe("eligible");
  });
  it("distinguishes before, overlapping and at-cutoff precision intervals", () => {
    const cutoff = utcMicros(rule.alternatives[0].cutoff);
    expect(evaluate(rule,[evidence({occurredAtMicros:(cutoff-BigInt(1000000)).toString()})]).status).toBe("eligible");
    expect(evaluate(rule,[evidence({occurredAtMicros:(cutoff-BigInt(1)).toString()})]).status).toBe("indeterminate");
    expect(evaluate(rule,[evidence({occurredAtMicros:cutoff.toString()})]).status).toBe("not_qualifying");
  });
  it("rejects wrong targets and permits authenticated artist relationships", () => {
    expect(evaluate(rule,[evidence({targetId:"wrong"})]).status).toBe("not_qualifying");
    expect(evaluate(rule,[evidence({targetId:"other",artistIds:[spotifyTarget]})]).status).toBe("eligible");
    expect(evaluate(rule,[]).status).toBe("awaiting_proof");
  });
  it("deduplicates event identity and counts distinct UTC days", () => {
    const repeated = {...rule,minimumDistinctEvents:2,minimumDistinctDays:2};
    expect(evaluate(repeated,[evidence(),evidence({id:"different-proof"})]).status).toBe("not_qualifying");
    expect(evaluate(repeated,[evidence(),evidence({id:"b",eventId:"b",occurredAtMicros:utcMicros("2024-01-02T00:00:00Z").toString()})]).status).toBe("eligible");
    expect(evaluate(repeated,[evidence(),evidence({id:"b",eventId:"b"})]).status).toBe("not_qualifying");
  });
  it("validates dates, targets, repeat rules, terms and deterministic commitments", () => {
    expect(()=>utcMicros("2025-02-30T00:00:00Z")).toThrow();
    expect(()=>utcMicros("2025-01-01T00:00:00+03:00")).toThrow();
    expect(()=>parseRoute({...rule.alternatives[0],targetId:"bad"})).toThrow();
    expect(()=>parseRule({...rule,payoutWei:"-1"})).toThrow();
    expect(()=>parseRule({...rule,minimumDistinctDays:2})).toThrow();
    expect(ruleCommitment(rule)).toBe(ruleCommitment(parseRule({...rule,irrelevant:true})));
    expect(ruleCommitment(rule)).not.toBe(ruleCommitment({...rule,capacity:3}));
  });
  it("enables supported reward routes without enabling unfinished activities", () => {
    const enabled = capabilities().filter(c => c.rewardReady).map(c => c.route);
    expect(enabled).toEqual(["spotify_saved_track", "youtube_subscription", "youtube_like"]);
  });
  it("uses stable, domain-separated keyed identities and rejects key-version changes", () => {
    vi.stubEnv("EARLY_SOURCE_NULLIFIER_SECRET",Buffer.alloc(32,7).toString("base64"));vi.stubEnv("EARLY_SOURCE_NULLIFIER_KEY_VERSION","1");
    const source=sourceKey("spotify","alice");
    expect(source).toBe(sourceKey("spotify","alice"));expect(source).not.toBe(sourceKey("youtube","alice"));
    expect(sourceNullifier("benefit-1",source)).not.toBe(sourceNullifier("benefit-2",source));
    expect(eventKey("same-event")).toBe(eventKey("same-event"));
    vi.stubEnv("EARLY_SOURCE_NULLIFIER_KEY_VERSION","2");expect(()=>sourceKey("spotify","alice")).toThrow(/migration/);
  });
});
