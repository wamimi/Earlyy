import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db:vi.fn(),snapshot:vi.fn(),indexed:vi.fn() }));
vi.mock("../src/lib/early/store",() => ({db:mocks.db}));
vi.mock("../src/lib/early/chain",() => ({benefitSnapshot:mocks.snapshot,escrowAddress:() => "0x0000000000000000000000000000000000000001"}));
vi.mock("../src/lib/early/indexed",() => ({indexedBenefit:mocks.indexed}));
import { campaignBenefits } from "../src/lib/early/campaign-benefits";
import { matchesBenefit } from "../src/lib/early/benefit-terms";
import { ruleCommitment } from "../src/lib/early/model";
import type { StoredRule } from "../src/lib/early/store";
const rule:StoredRule = {id:"r",user_id:"u",creator_wallet:"0x0000000000000000000000000000000000000002",commitment:"",definition:{version:1,title:"Support",alternatives:[{route:"youtube_subscription",targetId:`UC${"a".repeat(22)}`,cutoff:"2025-01-01T00:00:00.000Z"}],minimumDistinctEvents:1,minimumDistinctDays:1,payoutWei:"100",capacity:2,claimExpiry:2000000000}};
const benefit = () => ({creator:rule.creator_wallet,ruleHash:ruleCommitment(rule.definition),payout:BigInt(100),capacity:BigInt(2),expiry:BigInt(2000000000),ruleVersion:BigInt(1),closed:false,remaining:BigInt(100),claims:BigInt(1)});
beforeEach(() => {
  vi.resetAllMocks();vi.stubEnv("NEXT_PUBLIC_MONAD_ESCROW_ADDRESS","configured");
  mocks.db.mockResolvedValue([{benefit_id:"1",transaction_hash:"hash"}]);
  mocks.snapshot.mockResolvedValue({b:benefit(),block:{timestamp:1800000000}});
  mocks.indexed.mockResolvedValue({status:"syncing",benefit:null});
});
it("keeps a contract-confirmed benefit available while index totals are pending",async () => {
  const result=await campaignBenefits(rule);
  expect(result.benefits[0]).toMatchObject({id:"1",status:"available",indexStatus:"syncing"});
  expect(result.benefits[0].remainingWei).toBeUndefined();
});
it.each(["payout","capacity","expiry","ruleVersion"] as const)("rejects a linked benefit with changed %s",key => {
  expect(matchesBenefit(rule,{...benefit(),[key]:BigInt(999)})).toBe(false);
});
it("rejects a different creator or rule hash",() => {
  expect(matchesBenefit(rule,{...benefit(),creator:"0x0000000000000000000000000000000000000003"})).toBe(false);
  expect(matchesBenefit(rule,{...benefit(),ruleHash:`0x${"f".repeat(64)}`})).toBe(false);
});
it("shows exhausted funding as unavailable",async () => {
  mocks.snapshot.mockResolvedValue({b:{...benefit(),remaining:BigInt(0)},block:{timestamp:1800000000}});
  expect((await campaignBenefits(rule)).benefits[0].status).toBe("unavailable");
});
it("preserves technical failure as pending confirmation",async () => {
  mocks.snapshot.mockRejectedValue(new Error("RPC unavailable"));
  expect((await campaignBenefits(rule)).benefits[0].status).toBe("confirmation_pending");
});
