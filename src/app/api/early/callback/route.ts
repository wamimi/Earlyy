import type { NextRequest } from "next/server";
import { jsonBody, failure, response } from "@/lib/early/http";
import { db, one, type Session } from "@/lib/early/store";
import { completeSession, matchesToken } from "@/lib/early/verification";
import { ensure } from "@/lib/early/errors";
import { getReclaimProofs } from "@/lib/reclaim-proof";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("session") ?? "";
    const token = request.nextUrl.searchParams.get("token") ?? "";
    ensure(id.length > 0 && id.length <= 200 && /^[a-f0-9]{64}$/.test(token), "CALLBACK_FORBIDDEN", "Invalid callback capability.", 403);
    const s = await one<Session & { callback_token_hash: string }>("early_sessions", { id });
    ensure(s && matchesToken(token, s.callback_token_hash), "CALLBACK_FORBIDDEN", "Invalid callback capability.", 403);
    const payload = await jsonBody(request);
    const proofs = getReclaimProofs(payload);
    if (proofs.length === 0 && payload && typeof payload === "object" && !Array.isArray(payload)
      && ("error" in payload || ("status" in payload && ["failed", "error"].includes(String(payload.status))))) {
      if (s.proof_identifier) return response({ status: "verified", evidenceId: s.evidence_id });
      ensure(Date.parse(s.expires_at) > Date.now(), "SESSION_EXPIRED", "Start a new proof session.", 409);
      // Callback errors are diagnostic only and can never create evidence or eligibility.
      await db(`early_sessions?${new URLSearchParams({ id: `eq.${id}`, proof_identifier: "is.null" })}`, "PATCH", {
        last_error_code: "VERIFIER_FAILED", last_error_at: new Date().toISOString(),
      });
      return response({ status: "technical_failure" });
    }
    const evidence = await completeSession(proofs, s);
    return response({ status: "verified", evidenceId: evidence.id });
  } catch (e) { return failure(e); }
}
