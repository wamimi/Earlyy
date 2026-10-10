import { getAddress } from "ethers";
import { requireTeam, workspaceAccess, visibleRule } from "./access";
import { campaignBenefits } from "./campaign-benefits";
import { authorizeBenefit } from "./authorization";
import { benefitSnapshot, claimTransaction, monad, reconcileReceipt, transactionData } from "./chain";
import { ensure } from "./errors";
import { indexedBenefit } from "./indexed";
import { evaluate, parseRule, parseRoute, ruleCommitment, string } from "./model";
import { capabilities } from "./providers";
import { db, one, ownedEvidence, type Session, type StoredRule } from "./store";
import { completeSession, startSession } from "./verification";
import { getReclaimProofs } from "../reclaim-proof";
import { resolveSupportTarget } from "./targets";

export type Principal = { user_id: string; wallet: string };
export async function action(operation: string, input: Record<string, unknown>, user: Principal): Promise<unknown> {
  switch (operation) {
    case "resolve-target": {
      ensure(input.route === "spotify_saved_track" || input.route === "youtube_subscription", "UNSUPPORTED_ROUTE", "Choose Spotify or YouTube.");
      return resolveSupportTarget(input.route, string(input.link, 500));
    }
    case "access": return workspaceAccess(user.user_id);
    case "campaign-benefits": return campaignBenefits(await visibleRule(string(input.ruleId), user.user_id));
    case "publish-rule": {
      await requireTeam(user.user_id);
      const organizationId = string(input.organizationId);
      ensure(await one("early_organizations", { id: organizationId, approved: "true" }), "PARTNER_NOT_APPROVED", "Choose an approved partner.", 403);
      const r = await one<StoredRule>("early_rules", { id: string(input.ruleId), user_id: user.user_id });
      ensure(r, "RULE_NOT_FOUND", "Campaign not found.", 404);
      ensure(!r.published_at || r.organization_id === organizationId, "PARTNER_CONFLICT", "A published campaign cannot be reassigned to another partner.", 409);
      ensure(r.definition.claimExpiry > Date.now() / 1000, "INVALID_EXPIRY", "The campaign has expired.");
      return db("rpc/early_publish_campaign", "POST", { p_user: user.user_id, p_rule: r.id, p_organization: organizationId });
    }
    case "rules": {
      await requireTeam(user.user_id);
      const rule = parseRule(input.rule);
      ensure(rule.claimExpiry > Math.floor(Date.now() / 1000), "INVALID_EXPIRY", "Claim expiry must be in the future.");
      const commitment = ruleCommitment(rule);
      const existing = await one<StoredRule>("early_rules", { commitment, creator_wallet: user.wallet });
      if (existing) { ensure(existing.user_id === user.user_id, "RULE_CONFLICT", "An identical rule already exists.", 409); return existing; }
      const rows = await db<StoredRule[]>("early_rules", "POST", { user_id: user.user_id, creator_wallet: user.wallet, commitment, definition: rule });
      return rows[0];
    }
    case "list-rules": {
      const access = await workspaceAccess(user.user_id);
      const rows = await db<StoredRule[]>("early_rules?select=id,commitment,definition,creator_wallet,organization_id,published_at&order=created_at.desc&limit=50" + (access.team && input.includeDrafts === true ? "" : "&published_at=not.is.null"));
      const approved = await db<{id:string}[]>("early_organizations?approved=eq.true&select=id");
      return { access, rules: rows.filter(r => (access.team && input.includeDrafts === true) || approved.some(o => o.id === r.organization_id)), capabilities: capabilities() };
    }
    case "inspect": {
      ensure(input.consent === true, "CONSENT_REQUIRED", "Consent to checking your saved support records is required.");
      const rule = await visibleRule(string(input.ruleId), user.user_id);
      const evidence = await ownedEvidence(user.user_id);
      const evaluation = evaluate(rule.definition, evidence.map(e => e.evidence));
      return { evaluation, routes: rule.definition.alternatives.map(selection => ({ selection,
        status: evaluation.status === "eligible" ? "sufficient_evidence" : "awaiting_proof",
        selectionLocation: "campaign", coverage: capabilities().find(c => c.route === selection.route)?.coverage })), capabilities: capabilities() };
    }
    case "sessions": {
      ensure(input.consent === true, "CONSENT_REQUIRED", "Consent to proving this selected activity is required.");
      const selection = parseRoute(input.selection);
      const rule = input.ruleId === undefined ? null : await visibleRule(string(input.ruleId), user.user_id);
      ensure(!rule || rule.definition.alternatives.some(r => r.route === selection.route && r.targetId === selection.targetId && r.cutoff === selection.cutoff), "SELECTION_MISMATCH", "Activity does not match this campaign.");
      return startSession(user.user_id, user.wallet, selection, rule?.id);
    }
    case "session-status":
    case "complete": {
      const s = await one<Session>("early_sessions", { id: string(input.sessionId), user_id: user.user_id });
      ensure(s && getAddress(s.wallet) === getAddress(user.wallet), "SESSION_FORBIDDEN", "Session is not bound to this account and wallet.", 403);
      if (input.ruleId !== undefined) {
        ensure(JSON.parse(s.context_message).campaignId === string(input.ruleId), "SESSION_CAMPAIGN_MISMATCH", "This verification belongs to another campaign.", 403);
      }
      if (operation === "complete") {
        const e = await completeSession(getReclaimProofs(input.proofs), s);
        return { status: "verified", evidenceId: e.id, rewardReady: false };
      }
      return { sessionId: s.id, status: s.proof_identifier ? "verified" : Date.parse(s.expires_at) <= Date.now() ? "expired" : s.last_error_code ? "technical_failure" : "awaiting_proof",
        errorCode: s.last_error_code ?? null,
        evidenceId: s.evidence_id, expiresAt: s.expires_at, rewardReady: false };
    }
    case "evidence": {
      const rows = await ownedEvidence(user.user_id);
      return { records: rows.map(({ evidence: e }) => ({ id: e.id, platform: e.platform, activity: e.activity,
        targetId: e.targetId, occurredAtMicros: e.occurredAtMicros, precisionMicros: e.precisionMicros, provedAt: e.provedAt, coverage: e.coverage })) };
    }
    case "evaluate": {
      const rule = await visibleRule(string(input.ruleId), user.user_id);
      const records = await ownedEvidence(user.user_id);
      const result = evaluate(rule.definition, records.map(r => r.evidence));
      await db("early_evaluations", "POST", { user_id: user.user_id, rule_id: rule.id, result });
      return result;
    }
    case "authorize": return authorizeBenefit(user.user_id, user.wallet, string(input.benefitId));
    case "transaction": {
      const kind = string(input.action);
      if (kind === "claim") {
        const a = await authorizeBenefit(user.user_id, user.wallet, string(input.benefitId));
        return { transaction: claimTransaction(a.payload, a.signature), authorizationExpiry: a.payload.expiry };
      }
      if (kind === "create") {
        await requireTeam(user.user_id);
        const r = await one<StoredRule>("early_rules", { id: string(input.ruleId), user_id: user.user_id });
        ensure(r && getAddress(r.creator_wallet) === getAddress(user.wallet), "CREATOR_FORBIDDEN", "Use the creator wallet bound to this rule.", 403);
        const d = r.definition, value = amount(input.amountWei);
        ensure(BigInt(value) <= BigInt(d.payoutWei) * BigInt(d.capacity), "INVALID_AMOUNT", "Funding exceeds the benefit capacity.");
        ensure(d.claimExpiry > Date.now() / 1000, "INVALID_EXPIRY", "This rule's claim window has expired.");
        await monad();
        return { transaction: transactionData("create", [d.payoutWei, d.capacity, d.claimExpiry, r.commitment, d.version], value) };
      }
      ensure(kind === "fund" || kind === "refund", "INVALID_ACTION", "Unsupported transaction action.");
      const id = string(input.benefitId), s = await benefitSnapshot(id);
      ensure(getAddress(s.b.creator) === getAddress(user.wallet), "CREATOR_FORBIDDEN", "Only the benefit creator can perform this action.", 403);
      if (kind === "fund") {
        await requireTeam(user.user_id);
        const value = amount(input.amountWei);
        ensure(BigInt(value) > BigInt(0) && BigInt(value) <= s.b.payout * s.b.capacity - s.b.funded && !s.b.closed && BigInt(s.block.timestamp) < s.b.expiry, "FUNDING_UNAVAILABLE", "Funding is outside the open terms.", 409);
        return { transaction: transactionData("fund", [id], value) };
      }
      ensure(!s.b.closed && BigInt(s.block.timestamp) >= s.b.expiry, "REFUND_UNAVAILABLE", "Refunds open at the benefit expiry.", 409);
      return { transaction: transactionData("refund", [id]) };
    }
    case "reconcile": return reconcileReceipt(string(input.txHash), user.user_id, user.wallet);
    case "indexed": return indexedBenefit(string(input.benefitId), typeof input.txHash === "string" ? input.txHash : undefined);
    default: ensure(false, "NOT_FOUND", "Unknown operation.", 404);
  }
}
function amount(value: unknown) {
  const s = string(value, 78);
  ensure(/^\d+$/.test(s) && BigInt(s) < BigInt(2) ** BigInt(256), "INVALID_AMOUNT", "Use an integer amount in wei.");
  return s;
}
