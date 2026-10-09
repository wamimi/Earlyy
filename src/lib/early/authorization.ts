import { requirePublished } from "./access";
import { getAddress } from "ethers";
import { benefitSnapshot } from "./chain";
import { ensure } from "./errors";
import { evaluate, ruleCommitment } from "./model";
import { sourceNullifier } from "./nullifiers";
import { requireRewardAcceptance } from "./providers";
import { localTestnetSigner } from "./signing";
import { db, one, ownedEvidence, type StoredRule } from "./store";
import type { Authorization } from "./escrow-interface";

export async function authorizeBenefit(userId: string, wallet: string, benefitId: string) {
  const snapshot = await benefitSnapshot(benefitId);
  const { b, address, contract, block } = snapshot;
  const rule = await one<StoredRule>("early_rules", { commitment: b.ruleHash, creator_wallet: getAddress(b.creator) });
  ensure(rule && ruleCommitment(rule.definition) === b.ruleHash && BigInt(rule.definition.payoutWei) === b.payout
    && BigInt(rule.definition.capacity) === b.capacity && BigInt(rule.definition.claimExpiry) === b.expiry && b.ruleVersion === BigInt(rule.definition.version),
  "BENEFIT_TERMS_MISMATCH", "Benefit terms do not match an immutable Early rule.", 409);
  await requirePublished(rule);
  const records = await ownedEvidence(userId);
  const evaluation = evaluate(rule.definition, records.map(r => r.evidence));
  await db("early_evaluations", "POST", { user_id: userId, rule_id: rule.id, result: evaluation });
  ensure(evaluation.status === "eligible", "NOT_ELIGIBLE", evaluation.reason, 409);
  const selected = records.filter(r => evaluation.evidenceIds.includes(r.id));
  selected.forEach(r => requireRewardAcceptance(r.evidence.route));
  const now = Math.max(Math.floor(Date.now() / 1000), block.timestamp);
  ensure(!b.closed && BigInt(now) < b.expiry && b.remaining >= b.payout && b.claims < b.capacity,
    "BENEFIT_UNAVAILABLE", "The claim window, remaining funds or capacity do not permit a claim.", 409);
  const signer = localTestnetSigner();
  ensure(signer.address === snapshot.signer, "SIGNER_MISMATCH", "The configured signer does not match the contract.", 503);
  const benefitKey = `10143:${address.toLowerCase()}:${benefitId}`;
  const source = selected[0].source_key;
  const nullifier = sourceNullifier(benefitKey, source);
  const proposed: Authorization = { benefitId, beneficiary: getAddress(wallet), amount: b.payout.toString(),
    expiry: (BigInt(now + 300) < b.expiry ? BigInt(now + 300) : b.expiry).toString(), sourceNullifier: nullifier,
    ruleHash: b.ruleHash, ruleVersion: b.ruleVersion.toString(), signerEpoch: snapshot.epoch };
  const payload = await db<Authorization>("rpc/early_reserve_authorization", "POST", {
    p_benefit: benefitKey, p_user: userId, p_source: source, p_nullifier: nullifier, p_payload: proposed });
  const [usedSource, usedWallet] = await Promise.all([contract.consumed(benefitId, payload.sourceNullifier), contract.claimedWallet(benefitId, wallet)]);
  ensure(!usedSource && !usedWallet, "ALREADY_CLAIMED", "This benefit has already been claimed.", 409);
  ensure(BigInt(payload.expiry) > BigInt(now), "AUTHORIZATION_EXPIRED", "Retry to renew the authorization.", 409);
  return { payload, signature: await signer.sign(address, payload), chainId: 10143, contract: address };
}
