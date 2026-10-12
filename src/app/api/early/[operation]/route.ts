import type { NextRequest } from "next/server";
import { action } from "@/lib/early/actions";
import { authenticated, body, failure, response } from "@/lib/early/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  try {
    const input = await body(request);
    const user = await authenticated(request, input);
    return response(await action((await context.params).operation, input, user));
  } catch (e) { return failure(e); }
}
