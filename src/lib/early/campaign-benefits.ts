import { benefitSnapshot, escrowAddress } from "./chain";
import { indexedBenefit } from "./indexed";
import { matchesBenefit } from "./benefit-terms";
import { db, type StoredRule } from "./store";

export async function campaignBenefits(rule: StoredRule) {
  if (!process.env.NEXT_PUBLIC_MONAD_ESCROW_ADDRESS) return { status: "not_deployed", benefits: [] };
  const links = await db<{benefit_id:string;transaction_hash:string}[]>(`early_benefit_links?${new URLSearchParams({rule_id:`eq.${rule.id}`,contract_address:`eq.${escrowAddress().toLowerCase()}`,chain_id:"eq.10143",limit:"10"})}`);
  const benefits = await Promise.all(links.map(async link => {
    try {
      const snapshot = await benefitSnapshot(link.benefit_id);
      if (!matchesBenefit(rule, snapshot.b)) return { id:link.benefit_id, status:"terms_mismatch" };
      const indexed = await indexedBenefit(link.benefit_id, link.transaction_hash);
      const b = snapshot.b;
      const available = !b.closed && BigInt(snapshot.block.timestamp) < b.expiry && b.remaining >= b.payout && b.claims < b.capacity;
      return { id:link.benefit_id, status:available ? "available" : "unavailable", indexStatus:indexed.status,
        remainingWei: indexed.status === "indexed" ? indexed.benefit?.remaining : undefined,
        remainingCapacity: indexed.status === "indexed" && indexed.benefit ? (BigInt(indexed.benefit.capacity)-BigInt(indexed.benefit.claims)).toString() : undefined };
    } catch { return { id:link.benefit_id, status:"confirmation_pending" }; }
  }));
  return { status:links.length ? "linked" : "unfunded", benefits };
}
