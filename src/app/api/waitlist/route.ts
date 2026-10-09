import { NextResponse } from "next/server";
import { assertAllowedOrigin } from "@/lib/origins";
export const runtime = "nodejs";
const interests = ["supporter", "creator", "brand", "developer"] as const;
const reply = (error: string, status: number) => NextResponse.json({ error }, { status });
export async function POST(request: Request) {
  try { assertAllowedOrigin(request.headers.get("origin")); } catch { return reply("This signup must be submitted from the Early website.", 403); }
  if (!request.headers.get("content-type")?.includes("application/json")) return reply("Invalid signup format.", 415);
  let body;
  try {
    const text = await request.text();
    if (text.length > 8000) return reply("Signup is too large.", 413);
    body = JSON.parse(text);
  } catch { return reply("Invalid signup format.", 400); }
  if (!body || typeof body !== "object") return reply("Invalid signup format.", 400);
  if (body.website) return reply("We couldn’t process this signup.", 400);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const interest = body.interest;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !interests.includes(interest) || body.consent !== true) return reply("Enter a valid email, choose your interest, and agree to receive updates.", 400);
  const key = process.env.RESEND_API_KEY;
  const segment = process.env[`RESEND_WAITLIST_${interest.toUpperCase()}_SEGMENT_ID`];
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!key || !segment || (process.env.NODE_ENV === "production" && (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY))) return reply("Waitlist signup is temporarily unavailable. Please check back shortly.", 503);
  try {
    if (secret) {
      if (typeof body.token !== "string" || !body.token || body.token.length > 2048) return reply("Please complete the verification and try again.", 400);
      const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, response: body.token }), signal: AbortSignal.timeout(10000) });
      const verification = await check.json();
      const host = new URL(request.headers.get("origin")!).hostname;
      if (!check.ok || !verification.success || verification.action !== "waitlist" || verification.hostname !== host) return reply("Verification expired. Please try again.", 400);
    }
    const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const contactUrl = `https://api.resend.com/contacts/${encodeURIComponent(email)}`;
    const existing = await fetch(contactUrl, { headers, signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (existing.ok) {
      const contact = await existing.json();
      if (!contact.id) return reply("We couldn’t confirm your signup. Please try again.", 502);
      // Never overwrite an existing contact’s global unsubscribe preference.
      if (contact.unsubscribed) return reply("This email has unsubscribed from updates. Use the subscription settings in your previous Early email to rejoin.", 409);
      const added = await fetch(`${contactUrl}/segments/${encodeURIComponent(segment)}`, { method: "POST", headers, signal: AbortSignal.timeout(10000) });
      if (!added.ok) return reply("We couldn’t save your signup. Please try again in a moment.", added.status === 429 ? 429 : 502);
    } else if (existing.status === 404) {
      const saved = await fetch("https://api.resend.com/contacts", { method: "POST", headers, body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segment }] }), signal: AbortSignal.timeout(10000) });
      if (!saved.ok) return reply("We couldn’t save your signup. Please try again in a moment.", saved.status === 429 ? 429 : 502);
      const contact = await saved.json();
      if (!contact.id) return reply("We couldn’t confirm your signup. Please try again.", 502);
    } else {
      return reply("We couldn’t reach the waitlist. Please try again in a moment.", existing.status === 429 ? 429 : 502);
    }
    return NextResponse.json({ success: true });
  } catch { return reply("We couldn’t reach the waitlist. Please try again.", 502); }
}
