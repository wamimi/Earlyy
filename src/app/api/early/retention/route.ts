import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requireSetting, ensure } from "@/lib/early/errors";
import { db } from "@/lib/early/store";
import { failure, response } from "@/lib/early/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function purge(request: NextRequest, setting: "CRON_SECRET" | "RETENTION_CRON_SECRET") {
  try {
    const expected = Buffer.from(`Bearer ${requireSetting(setting)}`);
    const actual = Buffer.from(request.headers.get("authorization") ?? "");
    ensure(expected.length === actual.length && timingSafeEqual(expected, actual), "UNAUTHORIZED", "Invalid retention credential.", 401);
    return response({ purged: await db<number>("rpc/early_purge_raw_proofs", "POST", {}) });
  } catch (e) { return failure(e); }
}

// Vercel Cron sends GET with CRON_SECRET. Existing manual callers retain their own credential.
export function GET(request: NextRequest) { return purge(request, "CRON_SECRET"); }
export function POST(request: NextRequest) { return purge(request, "RETENTION_CRON_SECRET"); }
