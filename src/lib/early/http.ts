import { NextResponse, type NextRequest } from "next/server";
import { authenticatePrivyRequest } from "../privy-server";
import { assertAllowedOrigin } from "../origins";
import { EarlyError, ensure } from "./errors";
import { record, wallet } from "./model";

export async function jsonBody(request: Request): Promise<unknown> {
  ensure(request.headers.get("content-type")?.includes("application/json"), "INVALID_CONTENT_TYPE", "Use application/json.", 415);
  const reader = request.body?.getReader();
  ensure(reader, "INVALID_INPUT", "Request body is required.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1048576) { await reader.cancel(); throw new EarlyError("BODY_TOO_LARGE", "Request exceeds 1 MiB.", 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch (e) { if (e instanceof EarlyError) throw e; throw new EarlyError("INVALID_JSON", "Malformed JSON."); }
}
export async function body(request: Request) { return record(await jsonBody(request)); }
export async function authenticated(request: NextRequest, input: Record<string, unknown>) {
  try { assertAllowedOrigin(request.headers.get("origin")); }
  catch { throw new EarlyError("ORIGIN_FORBIDDEN", "Request origin is not allowed.", 403); }
  const address = wallet(input.wallet);
  try { return await authenticatePrivyRequest(request, address); }
  catch { throw new EarlyError("UNAUTHENTICATED", "Sign in with an account that owns this wallet.", 401); }
}
export function response(value: unknown) { return NextResponse.json(value, { headers: { "Cache-Control": "no-store" } }); }
export function failure(error: unknown) {
  const e = error instanceof EarlyError ? error : new EarlyError("TECHNICAL_FAILURE", "The operation could not be completed. Retry or check local service configuration.", 503);
  return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.status, headers: { "Cache-Control": "no-store" } });
}
