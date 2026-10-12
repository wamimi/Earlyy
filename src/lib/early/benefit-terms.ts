import { getAddress } from "ethers";
import { ruleCommitment } from "./model";
import type { StoredRule } from "./store";

export function matchesBenefit(rule: StoredRule, b: { creator: string; ruleHash: string; payout: bigint; capacity: bigint; expiry: bigint; ruleVersion: bigint }) {
  const d = rule.definition;
  return getAddress(rule.creator_wallet) === getAddress(b.creator) && ruleCommitment(d) === b.ruleHash &&
    BigInt(d.payoutWei) === b.payout && BigInt(d.capacity) === b.capacity && BigInt(d.claimExpiry) === b.expiry && BigInt(d.version) === b.ruleVersion;
}
