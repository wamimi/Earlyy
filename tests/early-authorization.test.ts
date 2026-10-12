import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), published: vi.fn(), one: vi.fn(), owned: vi.fn(), db: vi.fn(), signer: vi.fn() }));
vi.mock("../src/lib/early/chain", () => ({ benefitSnapshot: mocks.snapshot }));
vi.mock("../src/lib/early/access", () => ({ requirePublished: mocks.published }));
vi.mock("../src/lib/early/store", () => ({ one: mocks.one, ownedEvidence: mocks.owned, db: mocks.db }));
vi.mock("../src/lib/early/signing", () => ({ localTestnetSigner: mocks.signer }));
import { authorizeBenefit } from "../src/lib/early/authorization";
import { ruleCommitment, type Rule } from "../src/lib/early/model";

const wallet = "0x0000000000000000000000000000000000000011";
const address = "0x0000000000000000000000000000000000000022";
const signerAddress = "0x0000000000000000000000000000000000000033";
const sign = vi.fn(), consumed = vi.fn(), claimedWallet = vi.fn();
const rule: Rule = { version: 1, title: "Like demo", alternatives: [{ route: "youtube_like", targetId: "dQw4w9WgXcQ", cutoff: "2026-01-01T00:00:00Z" }],
  minimumDistinctEvents: 1, minimumDistinctDays: 1, payoutWei: "100", capacity: 2, claimExpiry: 2000000000 };
const evidence = { id: "event", route: "youtube_like", targetId: "dQw4w9WgXcQ", artistIds: [], eventId: "source-event", occurredAtMicros: "1700000000000000", precisionMicros: 1 };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("EARLY_SOURCE_NULLIFIER_SECRET", Buffer.alloc(32, 3).toString("base64"));
  vi.stubEnv("EARLY_SOURCE_NULLIFIER_KEY_VERSION", "1");
  mocks.one.mockResolvedValue({ id: "rule", definition: rule });
  mocks.owned.mockResolvedValue([{ id: "event", user_id: "fan", source_key: "bound-source", evidence }]);
  mocks.published.mockResolvedValue(undefined);
  mocks.snapshot.mockResolvedValue({ b: { creator: wallet, ruleHash: ruleCommitment(rule), payout: BigInt(100), capacity: BigInt(2),
    expiry: BigInt(2000000000), ruleVersion: BigInt(1), closed: false, remaining: BigInt(200), claims: BigInt(0) },
    address, contract: { consumed, claimedWallet }, block: { timestamp: Math.floor(Date.now() / 1000) }, signer: signerAddress, epoch: "1" });
  mocks.signer.mockReturnValue({ address: signerAddress, sign });
  mocks.db.mockImplementation(async (path, _method, body) => path === "rpc/early_reserve_authorization" ? body.p_payload : {});
  consumed.mockResolvedValue(false); claimedWallet.mockResolvedValue(false); sign.mockResolvedValue("test-signature");
});
it("authorizes eligible account-owned evidence without a manual acceptance switch", async () => {
  const result = await authorizeBenefit("fan", wallet, "1");
  expect(result).toMatchObject({ chainId: 10143, contract: address, signature: "test-signature", payload: { beneficiary: wallet, amount: "100" } });
  expect(mocks.owned).toHaveBeenCalledWith("fan");
  expect(mocks.published).toHaveBeenCalledOnce();
  expect(sign).toHaveBeenCalledOnce();
});
it.each(["consumed", "wallet"])("rejects a duplicate %s claim before signing", async field => {
  (field === "consumed" ? consumed : claimedWallet).mockResolvedValue(true);
  await expect(authorizeBenefit("fan", wallet, "1")).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
  expect(sign).not.toHaveBeenCalled();
});
it("rejects a fan with no qualifying evidence", async () => {
  mocks.owned.mockResolvedValue([]);
  await expect(authorizeBenefit("other-fan", wallet, "1")).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
  expect(sign).not.toHaveBeenCalled();
});
it.each(["terms", "funding", "expiry", "signer", "publication"])("retains the %s authorization boundary", async kind => {
  const snapshot = await mocks.snapshot();
  const codes = { terms: "BENEFIT_TERMS_MISMATCH", funding: "BENEFIT_UNAVAILABLE", expiry: "BENEFIT_UNAVAILABLE", signer: "SIGNER_MISMATCH", publication: "CAMPAIGN_UNAVAILABLE" };
  if (kind === "terms") snapshot.b.payout = BigInt(101);
  if (kind === "funding") snapshot.b.remaining = BigInt(0);
  if (kind === "expiry") snapshot.block.timestamp = 2000000000;
  if (kind === "signer") snapshot.signer = wallet;
  if (kind === "publication") mocks.published.mockRejectedValue({ code: codes.publication });
  await expect(authorizeBenefit("fan", wallet, "1")).rejects.toMatchObject({ code: codes[kind as keyof typeof codes] });
  expect(sign).not.toHaveBeenCalled();
});
