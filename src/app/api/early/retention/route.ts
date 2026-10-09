import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requireSetting, ensure } from "@/lib/early/errors";
import { db } from "@/lib/early/store";
import { failure, response } from "@/lib/early/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const expected = Buffer.from(`Bearer ${requireSetting("RETENTION_CRON_SECRET")}`);
    const actual = Buffer.from(request.headers.get("authorization") ?? "");
    ensure(expected.length === actual.length && timingSafeEqual(expected, actual), "UNAUTHORIZED", "Invalid retention credential.", 401);
    return response({ purged: await db<number>("rpc/early_purge_raw_proofs", "POST", {}) });
  } catch (e) { return failure(e); }
}
