"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ExternalLink, Info, LockKeyhole, Music2, Ticket, Video, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { formatEther } from "ethers";
import { useEarlyAuth } from "@/components/early-auth";
import type { Evaluation } from "@/lib/early/model";
import { activityLabel, targetLink, utcDate, type Campaign, type Capability } from "./model";
import s from "./fan-dashboard.module.css";

type Benefits = { status: string; benefits: { id:string; status:string; indexStatus?:string; remainingWei?:string; remainingCapacity?:string }[] };
type Session = { sessionId: string; requestUrl: string; expiresAt: string };
type Props = { campaign?: Campaign; loading: boolean; missing: boolean; error: string; connected: boolean; capabilities: Capability[];
  api: <T>(operation: string, input?: object, signal?: AbortSignal) => Promise<T>; onEvidence: () => void };
export function CampaignDetails({ campaign, loading, missing, error, connected, capabilities, api, onEvidence }: Props) {
  const auth = useEarlyAuth();
  const heading = useRef<HTMLHeadingElement>(null);
  const [selection, setSelection] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [benefits, setBenefits] = useState<Benefits | null>(null);
  const [polling, setPolling] = useState(false);
  const alive = useRef(true);
  const savedKey = campaign ? `early:fan-session:${auth.walletAddress}:${campaign.id}` : "";
  const onEvidenceRef = useRef(onEvidence);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { onEvidenceRef.current = onEvidence; }, [onEvidence]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { heading.current?.focus(); alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!savedKey) return;
    const timer = setTimeout(() => { try {
      const returned = new URLSearchParams(window.location.search).get("session");
      const raw = returned && /^[a-zA-Z0-9-]{1,200}$/.test(returned) ? JSON.stringify({ sessionId: returned, expiresAt: "" }) : sessionStorage.getItem(savedKey);
      if (!raw) return;
      const item = JSON.parse(raw) as Session;
      if (typeof item.sessionId === "string" && /^[a-zA-Z0-9-]{1,200}$/.test(item.sessionId) && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now())) {
        setSession({ ...item, requestUrl: "" }); setPolling(true); setStatus("Checking your previous verification…");
      } else sessionStorage.removeItem(savedKey);
    } catch { /* Session recovery is optional when browser storage is unavailable. */ } }, 0);
    return () => clearTimeout(timer);
  }, [savedKey]);
  const check = useCallback(async (signal?: AbortSignal) => {
    if (!session || !campaign) return;
    const result = await api<{ status: string }>("session-status", { sessionId: session.sessionId, ruleId: campaign.id }, signal);
    if (signal?.aborted || !alive.current) return;
    if (result.status === "verified") {
      setStatus("Proof received. Checking the campaign rules…");
      const next = await api<Evaluation>("evaluate", { ruleId: campaign.id }, signal);
      if (signal?.aborted || !alive.current) return;
      setEvaluation(next); setStatus(next.reason); setPolling(false); setSession(null); setConsent(false); onEvidenceRef.current();
      try { sessionStorage.removeItem(savedKey); } catch {}
    } else if (result.status === "expired" || Date.parse(session.expiresAt) <= Date.now()) {
      setPolling(false); setFailure("This verification link has expired. Choose an activity to try again."); setSession(null);
      try { sessionStorage.removeItem(savedKey); } catch {}
    } else if (result.status === "failed" || result.status === "technical_failure") { setPolling(false); setFailure("Verification couldn’t finish. This does not mean you’re ineligible."); }
    else setStatus("Waiting for your proof. Complete the steps in Reclaim Verifier.");
  }, [api, campaign, session, savedKey]);
  useEffect(() => {
    if (!polling) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try { await check(controller.signal); }
      catch (e) { if (!controller.signal.aborted) { setFailure(e instanceof Error ? e.message : "Couldn’t check your proof. Try again."); setPolling(false); } return; }
      if (!controller.signal.aborted) timer = setTimeout(tick, 5000);
    }
    void tick(); return () => { controller.abort(); clearTimeout(timer); };
  }, [check, polling]);
  async function start() {
    if (selection === null || !campaign || !consent || Date.now() >= campaign.definition.claimExpiry * 1000) return;
    setBusy(true); setFailure(""); setEvaluation(null);
    try {
      const existing = await api<{ evaluation: Evaluation }>("inspect", { ruleId: campaign.id, consent: true });
      if (!alive.current) return;
      if (existing.evaluation.status === "eligible") { setEvaluation(existing.evaluation); setStatus("Your saved support already satisfies these rules."); return; }
      const created = await api<Session>("sessions", { ruleId: campaign.id, selection: campaign.definition.alternatives[selection], consent: true });
      if (!alive.current) return;
      const url = new URL(created.requestUrl);
      if (url.protocol !== "https:" || !(url.hostname === "reclaimprotocol.org" || url.hostname.endsWith(".reclaimprotocol.org"))) throw new Error("The verification service returned an unexpected link.");
      setSession(created); setPolling(true); setStatus("Open Reclaim Verifier to continue.");
      try { sessionStorage.setItem(savedKey, JSON.stringify({ sessionId: created.sessionId, expiresAt: created.expiresAt })); } catch {}
    } catch (e) { if (alive.current) setFailure(e instanceof Error ? e.message : "Couldn’t start verification. Please try again."); }
    finally { if (alive.current) setBusy(false); }
  }
  useEffect(() => {
    if (!campaign) return;
    const controller = new AbortController();
    void api<Benefits>("campaign-benefits", { ruleId: campaign.id }, controller.signal)
      .then(value => { if (!controller.signal.aborted) setBenefits(value); })
      .catch(() => { if (!controller.signal.aborted) setBenefits({status:"unavailable",benefits:[]}); });
    return () => controller.abort();
  }, [api, campaign]);
  const rule = campaign?.definition;
  const rewardReady = Boolean(rule && rule.alternatives.every(r => capabilities.find(c => c.route === r.route)?.rewardReady));
  return <main id="campaign-content" tabIndex={-1} className={s.details} aria-labelledby="campaign-title">
    <div className={s.detailTop}><Link href="/dashboard" className={s.textButton}><ArrowLeft size={15}/>All campaigns</Link><Link href="/dashboard" className={s.iconButton} aria-label="Close campaign details"><X size={20}/></Link></div>
    <h2 id="campaign-title" ref={heading} tabIndex={-1}>{campaign?.definition.title ?? "Campaign details"}</h2>
    {!connected ? <div className={s.detailEmpty}><LockKeyhole size={27}/><h3>See what could qualify.</h3><p>Sign in to view this campaign’s rules and choose what to verify.</p><button className={s.primary} disabled={!auth.configured || !auth.ready} onClick={auth.login}>Sign in to continue</button></div> : !campaign ? <p role={error ? "alert" : "status"} className={s.body}>{error || (loading ? "Loading campaign…" : missing ? "This campaign is not available. Return to Discover to choose another." : "Loading campaign…")}</p> : <>
      <p className={s.organizer}>Organizer <span>{campaign.creator_wallet.slice(0,6)}…{campaign.creator_wallet.slice(-4)}</span></p>
      <div className={s.rewardSummary}><span><GiftIcon/>{formatEther(rule!.payoutWei)} <small>test MON</small></span><span className={s.badge}>{benefits?.benefits.some(b => b.status === "available") ? "Funding checked" : "Funding unconfirmed"}</span></div>
      <p className={s.footnote}>These are the organizer’s reward terms. Each benefit is checked against the contract before a claim.</p>
      <section aria-label="Campaign benefits"><h3>Reward availability</h3>{!benefits ? <p role="status">Checking funding…</p> : !benefits.benefits.length ? <p>{benefits.status === "unavailable" ? "Funding could not be checked. Try reopening this campaign." : "No confirmed funded benefit is linked yet."}</p> : benefits.benefits.map(b => <div key={b.id}><p>Benefit {b.id} · {b.status === "available" ? "Funding available; eligibility checks still apply" : b.status.replaceAll("_", " ")}</p>{b.remainingWei !== undefined ? <p>{formatEther(b.remainingWei)} test MON remaining · {b.remainingCapacity} places</p> : <p className={s.footnote}>Reward totals are awaiting the activity feed.</p>}<Link className={s.textButton} href={`/rewards?benefit=${encodeURIComponent(b.id)}`}>View reward <ArrowRight size={14}/></Link></div>)}</section>
      {evaluation?.status === "eligible" ? <div className={s.success} role="status"><Check size={25}/><h3>Your support meets these rules.</h3><p>{rewardReady ? "Check funding and availability in Rewards before claiming." : "Reward claims are still waiting for platform acceptance checks. No payment has been made."}</p><Link className={s.primary} href="/rewards">Open rewards <ArrowRight size={16}/></Link></div> : session ? <section className={s.handoff}><h3>Continue in Reclaim Verifier.</h3><p>Share the selected activity, then return here. Early checks the proof before deciding eligibility.</p>{session.requestUrl && <><div className={s.qr}><QRCodeSVG value={session.requestUrl} size={184} title="Scan to open Reclaim Verifier" /></div><a className={s.primary} href={session.requestUrl} target="_blank" rel="noreferrer">Open Reclaim Verifier <ExternalLink size={15}/></a></>}<p className={s.footnote}>{session.expiresAt ? `Expires ${utcDate(session.expiresAt)}.` : "Checking session expiry."} Returning from the app alone does not complete verification.</p><p role="status" className={s.proofStatus}>{status}</p>{!polling && <button className={s.secondary} onClick={() => { setFailure(""); setPolling(true); }}>Check proof status</button>}<button className={s.textButton} onClick={() => {setSession(null);setPolling(false);setFailure("");setConsent(false);try {sessionStorage.removeItem(savedKey);} catch {}}}>Choose another activity</button></section> : <>
        <section className={s.rules}><h3>{rule!.minimumDistinctEvents === 1 ? "Any one accepted activity can qualify." : `${rule!.minimumDistinctEvents} distinct activities are required.`}</h3><p>{rule!.minimumDistinctDays > 1 ? `Across at least ${rule!.minimumDistinctDays} different UTC dates.` : "Choose an activity you completed before its cutoff."}</p>
          {(["spotify_saved_track", "youtube_subscription"] as const).map(platform => {
            const options = rule!.alternatives.map((r,i) => ({r,i})).filter(({r}) => r.route === platform);
            if (!options.length) return null;
            return <details className={s.routeGroup} key={platform} open><summary><span className={platform === "spotify_saved_track" ? s.spotify : s.youtube}>{platform === "spotify_saved_track" ? <Music2 size={18}/> : <Video size={18}/>}</span>{platform === "spotify_saved_track" ? "Spotify" : "YouTube"}<ChevronDown size={16}/></summary><fieldset><legend className={s.srOnly}>{platform === "spotify_saved_track" ? "Spotify activities" : "YouTube activities"}</legend>{options.map(({r,i}) => <div className={s.routeChoice} key={i}><label><input type="radio" name="activity" checked={selection === i} onChange={() => {setSelection(i);setConsent(false);setFailure("");}}/><strong>{activityLabel(r)}</strong></label><p>Before {utcDate(r.cutoff)}</p><a href={targetLink(r)} target="_blank" rel="noreferrer">View {r.route === "youtube_subscription" ? "channel" : r.targetId.includes(":artist:") ? "artist" : "track"} <ExternalLink size={12}/></a><small className={s.target}>{r.targetId}</small></div>)}</fieldset></details>;
          })}
        </section>
        <div className={s.disclosure}><LockKeyhole size={17}/><div><strong>You choose what to share.</strong><p>The selected activity, its date and your source-account identifier are shared for verification. Your password is not shared with Early.</p><label className={s.consent}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>Check my saved records and verify my selected activity.</label></div></div>
        <button className={s.primary} disabled={selection === null || !consent || busy || now >= rule!.claimExpiry*1000} onClick={() => void start()}>{busy ? "Preparing verification…" : "Continue"}{!busy && <ArrowRight size={16}/>}</button>
        {now >= rule!.claimExpiry*1000 && <p className={s.footnote}>This campaign’s claim window has closed.</p>}
        {evaluation && <p role="status">{evaluation.reason}</p>}
        <p className={s.footnote}><Info size={13}/> If one route has no qualifying activity, try another accepted route. A technical error does not mean you’re ineligible.</p>
      </>}
      {failure && <p className={s.error} role="alert">{failure}</p>}
    </>}
  </main>;
}
function GiftIcon() { return <Ticket size={16} aria-hidden="true"/>; }
