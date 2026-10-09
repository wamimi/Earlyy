"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
export function WaitlistForm({ initialInterest = "supporter" }: { initialInterest?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [challengeVersion, setChallengeVersion] = useState(0);
  const widget = useRef<HTMLDivElement>(null);
  const joined = status === "success";
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    const api = (window as Window & { turnstile?: Turnstile }).turnstile;
    if (!sitekey || !scriptReady || !widget.current || !api || joined) return;
    const id = api.render(widget.current, { sitekey, action: "waitlist", theme: "light", callback: (value: string) => setToken(value), "expired-callback": () => setToken(""), "error-callback": () => { setToken(""); setMessage("Verification could not load. Please refresh and try again."); } });
    return () => { if (id) api.remove(id); };
  }, [sitekey, scriptReady, challengeVersion, joined]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const fields = new FormData(event.currentTarget);
    setStatus("sending"); setMessage("");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fields.get("email"), interest: fields.get("interest"), consent: fields.get("consent") === "on", website: fields.get("website"), token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t save your signup. Please try again.");
      setStatus("success");
    } catch (error) {
      setStatus("error"); setMessage(error instanceof Error ? error.message : "Please try again.");
      setToken(""); setChallengeVersion(value => value + 1);
    }
  }
  if (status === "success") return <div className="wl-success" role="status"><CheckCircle2 size={36} /><h2>You’re on the list.</h2><p>We’ll email you when Early opens. Thanks for being here at the beginning.</p></div>;
  return <form className="wl-form" onSubmit={submit}>
    <label>Email address<input type="email" name="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
    <label>I’m here as a<select name="interest" defaultValue={["supporter", "creator", "brand", "developer"].includes(initialInterest) ? initialInterest : "supporter"}><option value="supporter">Fan or supporter</option><option value="creator">Artist, creator, or community</option><option value="brand">Brand or business</option><option value="developer">Developer</option></select></label>
    <div className="wl-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <label className="wl-consent"><input type="checkbox" name="consent" required /><span>Email me about Early’s launch and early access. I can unsubscribe at any time.</span></label>
    {sitekey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setScriptReady(true)} onError={() => setMessage("Verification could not load. Please refresh and try again.")} /><div ref={widget} /></>}
    <button className="wl-submit" disabled={status === "sending" || Boolean(sitekey && !token)}>{status === "sending" ? "Joining…" : "Join the waitlist"}<ArrowRight size={19} /></button>
    <p className="wl-message" role="status">{message}</p><p className="wl-note">Your email and selected interest are stored with Resend to send Early updates. No wallet or social account needed.</p>
  </form>;
}
