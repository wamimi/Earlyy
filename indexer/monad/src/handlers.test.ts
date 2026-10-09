import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestIndexer } from "envio";

test("real HyperIndex handlers process creation, funding, payout and closure", async () => {
  const indexer = createTestIndexer();
  const creator = "0x0000000000000000000000000000000000000001";
  const beneficiary = "0x0000000000000000000000000000000000000002";
  const srcAddress = "0x0000000000000000000000000000000000000003";
  const ruleHash = `0x${"11".repeat(32)}`;
  await indexer.process({ chains: { 10143: { simulate: [
    { contract: "EarlyBenefitEscrow", event: "BenefitCreated", srcAddress, params: { benefitId: 1n, creator, payout: 10n, capacity: 2n, expiry: 2000000000n, ruleHash, ruleVersion: 1n } },
    { contract: "EarlyBenefitEscrow", event: "BenefitFunded", srcAddress, params: { benefitId: 1n, creator, amount: 20n, remaining: 20n } },
    { contract: "EarlyBenefitEscrow", event: "BenefitClaimed", srcAddress, params: { benefitId: 1n, beneficiary, sourceNullifier: ruleHash, amount: 10n, remaining: 10n, claims: 1n } },
    { contract: "EarlyBenefitEscrow", event: "BenefitClosed", srcAddress, params: { benefitId: 1n, creator, refund: 10n } },
  ] } } });
  const benefit = await indexer.Benefit.getOrThrow(`10143:${srcAddress}:1`);
  assert.equal(benefit.funded, 20n); assert.equal(benefit.paid, 10n); assert.equal(benefit.refunded, 10n); assert.equal(benefit.remaining, 0n); assert.equal(benefit.closed, true);
  assert.equal((await indexer.Claim.getAll()).length, 1);
  assert.equal((await indexer.IndexedEvent.getAll()).length, 4);
  const totals = await indexer.Creator.getOrThrow(`10143:${srcAddress}:${creator}`);
  assert.equal(totals.claims,1n); assert.equal(totals.paid,10n);
});
