"use client";

import Link from "next/link";
import { useMemo, useRef, useEffect, useState, useSyncExternalStore } from "react";
import { useEarlyAuth } from "./early-auth";
import { createEarlyClient, EarlyClientError, type IntegrationCampaign, type VerificationSession } from "@/lib/early/client";

export function DeveloperIntegration() {
  const auth = useEarlyAuth();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  if (!hydrated) return <p role="status">Loading your account…</p>;
  return !auth.ready || !auth.authenticated || !auth.walletAddress
    ? <div><p>Sign in to run requests against your own account. This example uses real responses, not fixtures.</p><button disabled={!auth.ready || !auth.configured} onClick={auth.login}>Sign in to try the example</button></div>
    : <AuthenticatedExample key={auth.walletAddress} />;
}
const subscribeHydration = () => () => {};

function AuthenticatedExample() {
  const { walletAddress, getAccessToken } = useEarlyAuth();
  const client = useMemo(() => createEarlyClient({ wallet: walletAddress, getAccessToken }), [walletAddress, getAccessToken]);
  const [campaigns, setCampaigns] = useState<IntegrationCampaign[]>([]);
  const [ruleId, setRuleId] = useState("");
  const [routeIndex, setRouteIndex] = useState(0);
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState<VerificationSession | null>(null);
  const [status, setStatus] = useState("Load published campaigns to begin.");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [eligible, setEligible] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  const campaign = campaigns.find(c => c.id === ruleId);
  async function run(work: (signal: AbortSignal) => Promise<void>) {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setError("");
    try { await work(controller.signal); }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof EarlyClientError ? `${e.code}: ${e.message}` : "The request could not be completed. This is not an ineligibility result."); }
    finally { pending.current = null; if (!controller.signal.aborted) setBusy(false); }
  }
  return <div>
    <button disabled={busy} onClick={() => void run(async signal => {
      const result = await client.listCampaigns(signal); if (signal.aborted) return;
      setCampaigns(result.rules);setRuleId("");setSession(null);setEligible(false);setConsent(false);
      setStatus(result.rules.length ? "Choose a campaign and one accepted activity." : "No published campaigns are available. An approved organizer must publish one first.");
    })}>Load published campaigns</button>
    <label>Campaign<select disabled={busy} value={ruleId} onChange={e => {setRuleId(e.target.value);setRouteIndex(0);setConsent(false);setSession(null);setEligible(false);setStatus("Review the selected campaign and consent before checking support.");}}>
      <option value="">Choose a campaign</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.definition.title}</option>)}
    </select></label>
    {campaign && <>
      <label>Activity to verify<select disabled={busy || Boolean(session)} value={routeIndex} onChange={e => {setRouteIndex(Number(e.target.value));setConsent(false);}}>
        {campaign.definition.alternatives.map((r,i) => <option key={i} value={i}>{r.route === "spotify_saved_track" ? "Spotify saved track" : "YouTube subscription"} · {r.targetId}</option>)}
      </select></label>
      <p>Before {campaign.definition.alternatives[routeIndex].cutoff}. Alternatives use OR; this campaign requires {campaign.definition.minimumDistinctEvents} distinct event(s) across {campaign.definition.minimumDistinctDays} UTC day(s).</p>
      <label className="dr-consent"><input type="checkbox" disabled={busy} checked={consent} onChange={e => setConsent(e.target.checked)} />I agree to checking my stored support and, if I start verification, sharing the selected activity, its date and source-account identifier with Early.</label>
      <div className="dr-actions"><button disabled={busy || !consent} onClick={() => void run(async signal => {
        const { evaluation } = await client.inspect(ruleId,consent,signal);if (signal.aborted) return;
        setEligible(evaluation.status === "eligible");setStatus(`${evaluation.status}: ${evaluation.reason} Eligibility does not confirm reward availability or payment.`);
      })}>Check stored support</button>
      <button disabled={busy || !consent || eligible || Boolean(session)} onClick={() => void run(async signal => {
        const next = await client.startVerification(ruleId,campaign.definition.alternatives[routeIndex],consent,signal);
        const url = new URL(next.requestUrl);
        if (url.protocol !== "https:" || !(url.hostname === "reclaimprotocol.org" || url.hostname.endsWith(".reclaimprotocol.org"))) throw new Error("Unexpected verifier URL");
        if (signal.aborted) return;setSession(next);setStatus("Request created. Open Reclaim Verifier and approve sharing the selected activity. Returning alone does not verify it.");
      })}>Start selected verification</button></div>
    </>}
    {session && <div><a href={session.requestUrl} target="_blank" rel="noreferrer">Open Reclaim Verifier</a><p>Expires {session.expiresAt}. The campaign page handles your return.</p>
      <button disabled={busy || !consent} onClick={() => void run(async signal => {
        const result = await client.verificationStatus(ruleId,session.sessionId,signal); if (signal.aborted) return;
        if (result.status === "verified") {
          const evaluation = await client.evaluate(ruleId,signal);if (signal.aborted) return;
          setEligible(evaluation.status === "eligible");setStatus(`Proof stored. ${evaluation.status}: ${evaluation.reason} Reward acceptance remains separate.`);
        } else {setStatus(`${result.status}${result.errorCode ? `: ${result.errorCode}` : ""}. No verified reward or payment is implied.`);if(result.status === "expired") setSession(null);}
      })}>Check verification result</button>
      <Link href={`/dashboard/campaigns/${encodeURIComponent(ruleId)}?session=${encodeURIComponent(session.sessionId)}`}>Continue in campaign</Link>
    </div>}
    <p role="status" aria-live="polite">{busy ? "Request in progress…" : status}</p>{error && <p role="alert">{error}</p>}
  </div>;
}
