import type { NextRequest } from "next/server";
import { jsonBody, failure, response } from "@/lib/early/http";
import { one, type Session } from "@/lib/early/store";
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
    const evidence = await completeSession(getReclaimProofs(await jsonBody(request)), s);
    return response({ status: "verified", evidenceId: evidence.id });
  } catch (e) { return failure(e); }
}
