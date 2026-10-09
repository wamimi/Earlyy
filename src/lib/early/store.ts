import { EarlyError, requireSetting } from "./errors";
import type { Evidence, Rule, RuleRoute, RouteId } from "./model";

export type Session = {
  id: string; user_id: string; wallet: string; route: RouteId; selection: RuleRoute;
  context_message: string; provider_id: string; provider_version: string; recipe_hash: string;
  request_url: string; created_at: string; expires_at: string; proof_identifier: string | null; evidence_id: string | null;
  last_error_code?: string | null;
};
export type StoredRule = { id: string; user_id: string; creator_wallet: string; commitment: string; organization_id?: string | null; published_at?: string | null; definition: Rule };
export type StoredEvidence = { id: string; user_id: string; source_key: string; evidence: Evidence };

export async function db<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const key = requireSetting("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${requireSetting("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`, {
    method, headers: { apikey: key, ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json", Prefer: path.includes("on_conflict=") ? "return=representation,resolution=merge-duplicates" : "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const known = ["SESSION_FORBIDDEN", "SESSION_CONFLICT", "SESSION_EXPIRED", "SOURCE_ALREADY_BOUND", "SOURCE_RELINK_FORBIDDEN", "EVENT_CONFLICT", "WALLET_AUTHORIZATION_PENDING", "TERMS_CONFLICT"];
    const code = known.includes(detail.message) ? detail.message : "STORAGE_UNAVAILABLE";
    throw new EarlyError(code, code === "STORAGE_UNAVAILABLE" ? "Durable storage is unavailable. Verify the migration and service configuration." : code.replaceAll("_", " "), code === "STORAGE_UNAVAILABLE" ? 503 : 409);
  }
  return response.json() as Promise<T>;
}
export async function one<T>(table: string, filters: Record<string, string>): Promise<T | null> {
  const q = new URLSearchParams({ select: "*", limit: "1" });
  for (const [key, value] of Object.entries(filters)) q.set(key, `eq.${value}`);
  const rows = await db<T[]>(`${table}?${q}`);
  return rows[0] ?? null;
}
export async function ownedEvidence(userId: string) {
  return db<StoredEvidence[]>(`early_evidence?${new URLSearchParams({ user_id: `eq.${userId}`, select: "*", order: "created_at.asc", limit: "1000" })}`);
}
