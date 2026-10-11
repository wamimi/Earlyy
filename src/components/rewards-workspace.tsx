"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { BrowserProvider, formatEther, getAddress, parseEther } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { useEarlyAuth } from "./early-auth";
import type { Evaluation, Rule, RuleRoute } from "@/lib/early/model";
import type { SupportTarget } from "@/lib/early/targets";
import { proofStatusText } from "@/lib/early/proof-status";
import styles from "./rewards-workspace.module.css";

type RuleView = { id: string; commitment: string; creator_wallet: string; definition: Rule };
type SessionView = { sessionId: string; requestUrl: string; expiresAt: string };
type Tx = { to: string; data: string; value: string; chainId: string };
type Indexed = { status: string; benefit: { funded: string; paid: string; refunded: string; remaining: string; claims: string; capacity: string } | null;
  claims: { id: string; beneficiary: string; amount: string; transactionHash: string }[];
  creator: { funded: string; paid: string; refunded: string; benefits: string; claims: string } | null };

export function RewardsWorkspace({ deployed, initialSessionId, initialBenefitId }: { deployed: boolean; initialSessionId?: string; initialBenefitId?: string }) {
  const auth = useEarlyAuth();
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  return <main className={styles.page}>
    <Link href="/">← Early</Link>
    <p className={styles.meta}>Monad testnet · Support & rewards</p>
    <h1>Your support has a history.</h1>
    <p>Verify an activity you choose, check a creator’s rules, and claim an available reward. Your source account and private proof stay off-chain.</p>
    <p className={styles.notice}>Test rewards use test MON. Spotify and YouTube reward claims are awaiting device and account-ownership validation. Test MON does not represent merchandise or ticket fulfillment.</p>
    {!deployed && <p className={styles.meta}>The reward contract is not deployed yet. You can prepare rules and support records; funding and claims will become available after setup.</p>}
    {!hydrated ? <p role="status">Loading your account…</p> : !auth.ready || !auth.authenticated || !auth.walletAddress
      ? <section className={styles.section}><h2>Connect your Early account</h2><p>Use your account wallet to keep support records and rewards together.</p>
        <button className={styles.button} disabled={!auth.ready || !auth.configured} onClick={auth.login}>Sign in to continue</button>
        {!auth.ready && <p role="status">Connecting to account services… If this persists, check your connection and reload the page.</p>}
        {!auth.configured && <p>Account sign-in is not configured for this environment.</p>}</section>
      : <Workspace key={auth.walletAddress} deployed={deployed} initialSessionId={initialSessionId} initialBenefitId={initialBenefitId} />}
  </main>;
}
const subscribeHydration = () => () => {};

function Workspace({ deployed, initialSessionId, initialBenefitId }: { deployed: boolean; initialSessionId?: string; initialBenefitId?: string }) {
  const auth = useEarlyAuth();
  const [rules, setRules] = useState<RuleView[]>([]);
  const [ruleId, setRuleId] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose an opportunity or create a rule to begin.");
  const [error, setError] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [session, setSession] = useState<SessionView | null>(initialSessionId ? {sessionId:initialSessionId, requestUrl:"", expiresAt:""} : null);
  const [polling, setPolling] = useState(Boolean(initialSessionId));
  const [verified, setVerified] = useState(false);
  const sessionId = session?.sessionId;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (sessionId) url.searchParams.set("session", sessionId);
    else url.searchParams.delete("session");
    window.history.replaceState(window.history.state, "", url);
  }, [sessionId]);
  const verificationPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (session?.requestUrl) verificationPanel.current?.focus(); }, [session?.requestUrl]);
  const [benefitId, setBenefitId] = useState(initialBenefitId ?? "");
  const [access, setAccess] = useState<{team:boolean;organizations:{id:string;name:string;kind:string}[]} | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [txHash, setTxHash] = useState("");
  const [indexed, setIndexed] = useState<Indexed | null>(null);
  const [balance, setBalance] = useState("");
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const rule = rules.find(r => r.id === ruleId);
  const { getAccessToken, walletAddress } = auth;
  const api = useCallback(async <T,>(operation: string, input: object = {}, signal?: AbortSignal): Promise<T> => {
    const token = await getAccessToken();
    const response = await fetch(`/api/early/${operation}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, wallet: walletAddress }), signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "The request could not be completed.");
    return data as T;
  }, [getAccessToken, walletAddress]);
  const checkProof = useCallback(async (signal?: AbortSignal) => {
    if (!session) return;
    const result = await api<{ status: string }>("session-status", { sessionId: session.sessionId }, signal);
    if (!active.current || signal?.aborted) return;
    setError("");
    setVerified(result.status === "verified");
    setStatus(proofStatusText(result.status));
    if (result.status === "verified" && ruleId) {
      const next = await api<Evaluation>("evaluate", { ruleId }, signal);
      if (active.current && !signal?.aborted) { setEvaluation(next); setStatus(next.reason); }
    }
    if (result.status !== "awaiting_proof" && active.current && !signal?.aborted) {
      setPolling(false);
      setSession(current => current?.sessionId === session.sessionId && current.requestUrl ? { ...current, requestUrl: "" } : current);
    }
  }, [api, session, ruleId]);
  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void checkProof(controller.signal).catch(() => {
        if (!controller.signal.aborted) setError("Couldn’t check verification status. Use Check proof status to retry.");
      });
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [session, checkProof]);
  useEffect(() => {
    if (!polling || !session) return;
    let cancelled = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try { await checkProof(controller.signal); }
      catch { if (!cancelled) { setPolling(false); setError("Couldn’t check verification status. Your proof may still arrive; use Check proof status to retry."); } return; }
      if (!cancelled) timer = setTimeout(tick, 5000);
    }
    void tick();
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [polling, session, checkProof]);
  useEffect(() => {
    let cancelled = false;
    void api<{team:boolean;organizations:{id:string;name:string;kind:string}[]}>("access").then(value => { if (!cancelled) setAccess(value); }).catch(() => { if (!cancelled) setError("Couldn’t load workspace permissions. Creator controls remain locked."); });
    return () => { cancelled = true; };
  }, [api]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError("");
    try { await work(); }
    catch (e) {
      const code = (e as { code?: unknown })?.code;
      setError(code === 4001 || code === "ACTION_REJECTED" ? "You declined the wallet request. No payment was confirmed." : e instanceof Error ? e.message : "The action could not be completed.");
    } finally { setBusy(false); }
  }
  async function loadRules() {
    const result = await api<{ rules: RuleView[] }>("list-rules", { includeDrafts: access?.team === true });setRules(result.rules);
    if (!ruleId && result.rules[0]) setRuleId(result.rules[0].id);
    setStatus(result.rules.length ? "Choose an opportunity to check your support." : "No rules yet. A creator can prepare the first one below.");
  }
  async function refreshIndexed(id = benefitId, hash = txHash) {
    if (!id) return;
    const data = await api<Indexed>("indexed", { benefitId: id, ...(hash ? { txHash: hash } : {}) });setIndexed(data);
    if (data.status === "syncing") setStatus("Payment confirmed. The activity feed is still syncing.");
    if (data.status === "indexed") setStatus("The activity feed is up to date.");
  }
  async function reconcile(hash = txHash) {
    const receipt = await api<{ status: string; events?: { benefitId: string }[] }>("reconcile", { txHash: hash });
    if (receipt.status !== "confirmed") { setStatus("Transaction submitted. Waiting for receipt confirmation."); return; }
    const id = receipt.events?.find(event => event.benefitId === benefitId)?.benefitId ?? receipt.events?.[0]?.benefitId ?? benefitId;
    setBenefitId(id);setStatus("Transaction confirmed. Checking the activity feed…");await refreshIndexed(id, hash);
  }
  async function transact(kind: "create" | "fund" | "claim" | "refund", amountMon = "0") {
    setStatus("Checking your account, benefit terms and network…");
    const prepared = await api<{ transaction: Tx; authorizationExpiry?: string }>("transaction", {
      action: kind, ruleId, benefitId, amountWei: parseEther(amountMon).toString(),
    });
    if (!active.current) return;
    await auth.switchChain(10143);
    const provider = new BrowserProvider(await auth.getEthereumProvider());
    if ((await provider.getNetwork()).chainId !== BigInt(10143)) throw new Error("Switch to Monad testnet to continue.");
    const signer = await provider.getSigner();
    if (!active.current || getAddress(await signer.getAddress()) !== getAddress(auth.walletAddress)) throw new Error("Wallet changed. Reopen the reward and try again.");
    if (prepared.authorizationExpiry && BigInt(prepared.authorizationExpiry) <= BigInt(Math.floor(Date.now()/1000))) throw new Error("Authorization expired. Click claim again to refresh it.");
    const tx = { to: prepared.transaction.to, data: prepared.transaction.data, value: BigInt(prepared.transaction.value) };
    if (kind === "claim" && auth.canSponsorClaims) {
      setStatus("Approve your reward claim. Requesting sponsored gas through Privy…");
      let hash: string;
      try {
        ({ hash } = await auth.sponsorClaim(prepared.transaction));
      } catch (cause) {
        const code = (cause as { code?: unknown })?.code;
        if (code === 4001 || code === "ACTION_REJECTED") throw cause;
        throw new Error("The sponsored claim could not be submitted or confirmed. Check your wallet activity before retrying. Early will not switch to charging you gas automatically.");
      }
      if (!active.current) return;
      setTxHash(hash);setStatus("Claim submitted. Waiting for receipt confirmation…");
      const receipt = await provider.waitForTransaction(hash, 2, 90000);
      if (!receipt || receipt.status !== 1) throw new Error("No successful receipt yet. Check transaction status before retrying.");
      if (active.current) await reconcile(hash);
      return;
    }
    const [gas, fee, funds] = await Promise.all([signer.estimateGas(tx), provider.getFeeData(), provider.getBalance(auth.walletAddress)]);
    setBalance(formatEther(funds));
    if (funds < tx.value + gas * (fee.maxFeePerGas ?? fee.gasPrice ?? BigInt(0))) throw new Error("This wallet needs more test MON for the payment and gas.");
    if (!active.current) return;
    setStatus(`Confirm in your wallet. Estimated gas: ${formatEther(gas * (fee.maxFeePerGas ?? fee.gasPrice ?? BigInt(0)))} MON.`);
    const sent = await signer.sendTransaction(tx);setTxHash(sent.hash);setStatus("Transaction submitted. Waiting for receipt confirmation…");
    const receipt = await sent.wait(2, 90000);
    if (!receipt || receipt.status !== 1) throw new Error("No successful receipt yet. Check transaction status before retrying.");
    await reconcile(sent.hash);
  }
  return <>
    <p className={styles.wallet}>Account wallet: {auth.walletAddress}{balance && ` · ${balance} test MON`}</p>
    <div className={styles.status} role="status" aria-live="polite">{status}</div>
    {error && <p className={`${styles.status} ${styles.error}`} role="alert">{error}</p>}
    <section className={styles.section}>
      <h2>Check your support</h2>
      <div className={styles.row}><label className={styles.field}>Opportunity<select value={ruleId} onChange={e => { setRuleId(e.target.value);setEvaluation(null);setSession(null);setConsent(false); }}>
        <option value="">Choose an opportunity</option>{rules.map(r => <option key={r.id} value={r.id}>{r.definition.title}</option>)}</select></label>
        <button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => run(loadRules)}>Load opportunities</button></div>
      {rule && <>
        <p>Any accepted activity can qualify. This rule requires {rule.definition.minimumDistinctEvents} distinct event(s) across {rule.definition.minimumDistinctDays} UTC date(s).</p>
        <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I consent to checking my saved support records and proving the activity I select. My full platform history will not be made public.</label>
        <button className={styles.button} disabled={busy || !consent} onClick={() => run(async () => {
          const result = await api<{ evaluation: Evaluation }>("inspect", { ruleId, consent });setEvaluation(result.evaluation);setStatus(result.evaluation.reason);
        })}>Check saved records</button>
        {evaluation && <p>{evaluation.status.replaceAll("_", " ")}: {evaluation.reason}</p>}
        {rule.definition.alternatives.map((selection, i) => <div key={`${selection.route}-${i}`} className={styles.route}>
          <p><strong>{selection.route === "spotify_saved_track" ? "Spotify saved track" : "YouTube subscription"}</strong><br />{selection.targetId}<br />Before {selection.cutoff} (UTC)</p>
          <button className={`${styles.button} ${styles.secondary}`} disabled={busy || !consent || evaluation?.status === "eligible"} onClick={() => run(async () => {
            const result = await api<SessionView>("sessions", { ruleId, selection, consent });setSession(result);setVerified(false);setPolling(true);setStatus("Open Reclaim Verifier and sign in. Early will update when your proof arrives.");
          })}>Verify {selection.route === "spotify_saved_track" ? "Spotify" : "YouTube"} activity</button>
        </div>)}
      </>}
      {session && <div ref={verificationPanel} tabIndex={-1} aria-label="Complete verification">
        <p>On your phone, open Reclaim Verifier. On a computer, scan the QR code with your phone. Sign into the source account you used to save the song or subscribe to the channel. You do not need to play anything or change your existing support.</p>
        {session.requestUrl && <><div className={styles.qr}><QRCodeSVG value={session.requestUrl} size={190} title="Open this proof request in Reclaim Verifier" /></div>
        <p><a href={session.requestUrl} target="_blank" rel="noreferrer">Open Reclaim Verifier</a> · Expires {new Date(session.expiresAt).toLocaleTimeString()}</p></>}
        {verified && <p role="status">Your verified support is in your private archive. <Link href="/dashboard#support">View my support →</Link></p>}
        <button className={styles.button} disabled={busy} onClick={() => run(checkProof)}>Check proof status</button>
      </div>}
      <section id="save-support" className={styles.route} aria-labelledby="save-support-title"><h3 id="save-support-title">Save support before a campaign exists</h3>
        <StandaloneProof busy={busy} resolve={(route, link) => api<SupportTarget>("resolve-target", { route, link })} start={selection => run(async () => {setPolling(false);setSession(null);const created=await api<SessionView>("sessions", { selection, consent: true });setRuleId("");setEvaluation(null);setSession(created);setVerified(false);setPolling(true);setStatus("Open Reclaim Verifier and sign in. The selected activity will be saved only after its proof is verified.");})} />
      </section>
    </section>
    <section className={styles.section}>
      <h2>Benefit activity</h2><p>Funding and payouts are public on Monad testnet. Early’s eligibility signer authorizes claims; the contract does not independently verify your platform activity.</p>
      <p className={styles.meta}>{auth.canSponsorClaims ? "Claims from your Early wallet request sponsored gas through Privy. You do not need MON for claim fees when sponsorship is available." : "Claims from an external wallet require test MON for gas."} Campaign funding and refunds use the funding wallet’s gas.</p>
      <div className={styles.row}><label className={styles.field}>Benefit ID<input inputMode="numeric" value={benefitId} onChange={e => {setBenefitId(e.target.value);setIndexed(null);setTxHash("");}} placeholder="ID from a confirmed creation" /></label>
        <button className={`${styles.button} ${styles.secondary}`} disabled={busy || !deployed || !benefitId} onClick={() => run(() => refreshIndexed())}>Refresh activity</button>
        <button className={styles.button} disabled={busy || !deployed || !benefitId} onClick={() => run(() => transact("claim"))}>Check eligibility & claim</button></div>
      <button className={`${styles.button} ${styles.secondary}`} disabled={busy || !deployed || !benefitId} onClick={() => run(() => transact("refund"))}>Refund expired benefit (funding wallet only)</button>
      {txHash && <p><a href={`https://testnet.monadvision.com/tx/${txHash}`} target="_blank" rel="noreferrer">View transaction</a> · <button className={`${styles.button} ${styles.secondary}`} disabled={busy} onClick={() => run(() => reconcile())}>Check confirmation</button></p>}
      {indexed && <p>Activity feed: {indexed.status.replaceAll("_", " ")}. {indexed.status === "unavailable" || indexed.status === "not_configured" ? "This does not mean a confirmed payment failed." : ""}</p>}
      {indexed?.benefit && <p>Funded {formatEther(indexed.benefit.funded)} MON · Paid {formatEther(indexed.benefit.paid)} MON · Remaining {formatEther(indexed.benefit.remaining)} MON · {BigInt(indexed.benefit.capacity) - BigInt(indexed.benefit.claims)} places left</p>}
      {indexed?.creator && <p>Creator totals: {indexed.creator.benefits} benefits · {indexed.creator.claims} claims · {formatEther(indexed.creator.paid)} MON paid · {formatEther(indexed.creator.refunded)} MON refunded</p>}
      {indexed?.claims.length ? <div className={styles.scroll}><table className={styles.table}><caption>Confirmed indexed claims</caption><thead><tr><th>Recipient</th><th>Test MON</th><th>Transaction</th></tr></thead><tbody>{indexed.claims.map(c => <tr key={c.id}><td>{c.beneficiary}</td><td>{formatEther(c.amount)}</td><td><a href={`https://testnet.monadvision.com/tx/${c.transactionHash}`}>View</a></td></tr>)}</tbody></table></div> : null}
    </section>
    {access?.team ? <section className={styles.section}><h2>Early campaign management</h2><p>Define immutable reward terms. Funding can be added during the claim window; unclaimed funds can be refunded after it closes.</p>
      <RuleForm disabled={busy} create={definition => run(async () => {
        const saved = await api<RuleView>("rules", { rule: definition });await loadRules();setRuleId(saved.id);setStatus("Rule saved. Review the terms before funding the benefit.");
      })} />
      <div className={styles.row}><label className={styles.field}>Approved partner<select value={organizationId} onChange={e => setOrganizationId(e.target.value)}><option value="">Choose partner</option>{access.organizations.map(o => <option key={o.id} value={o.id}>{o.name} · {o.kind}</option>)}</select></label><button className={styles.button} disabled={busy || !rule || !organizationId} onClick={() => run(async () => { await api("publish-rule", {ruleId,organizationId});setStatus("Campaign published to the fan dashboard."); })}>Publish campaign</button></div>
      <FundingForm disabled={busy || !deployed} selectedRule={Boolean(rule)} benefitSelected={Boolean(benefitId)} transact={(kind, amount) => run(() => transact(kind, amount))} />
    </section> : <section className={styles.section}><h2>{access?.organizations.length ? "Your partner workspace" : "For artists & brands"}</h2>{access?.organizations.map(o => <p key={o.id}>{o.name} · Approved {o.kind} partner</p>)}<p>Campaigns are set up with the Early team. Recognize early supporters, reward loyalty and measure verified participation and redemptions.</p><Link href="/brands">Work with Early</Link></section>}
  </>;
}

function StandaloneProof({ busy, start, resolve }: { busy: boolean; start: (r: RuleRoute) => void; resolve: (route: RuleRoute["route"], link: string) => Promise<SupportTarget> }) {
  const [route, setRoute] = useState<RuleRoute["route"]>("spotify_saved_track");
  const [consent, setConsent] = useState(false);
  const [link, setLink] = useState("");
  const [target, setTarget] = useState<SupportTarget | null>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const revision = useRef(0);
  function reset() { revision.current++; setTarget(null); setConsent(false); setError(""); }
  async function review(event: FormEvent) {
    event.preventDefault(); const current = ++revision.current; setResolving(true); setError(""); setTarget(null); setConsent(false);
    try { const value = await resolve(route, link); if (current === revision.current) setTarget(value); }
    catch (cause) { if (current === revision.current) setError(cause instanceof Error ? cause.message : "Couldn’t load this target. Try again."); }
    finally { setResolving(false); }
  }
  return <form onSubmit={review}>
    <p>Preserve an existing song save, channel subscription or video like. Copy its public link from Spotify or YouTube—no IDs needed.</p>
    <div className={styles.row}><label className={styles.field}>Activity<select value={route} disabled={busy || resolving} onChange={e => {reset();setLink("");setRoute(e.target.value as RuleRoute["route"]);}}><option value="spotify_saved_track">Spotify track save</option><option value="youtube_subscription">YouTube subscription</option><option value="youtube_like">YouTube video like · testing</option></select></label>
      <label className={styles.field}>{route === "spotify_saved_track" ? "Song or artist link" : route === "youtube_like" ? "Video link" : "Channel link"}<input name="target" required disabled={busy || resolving} value={link} onChange={e => {reset();setLink(e.target.value);}} placeholder={route === "spotify_saved_track" ? "https://open.spotify.com/track/…" : route === "youtube_like" ? "https://www.youtube.com/watch?v=…" : "https://www.youtube.com/@mitocw"} /></label>
      <button className={`${styles.button} ${styles.secondary}`} disabled={busy || resolving || !link.trim()}>{resolving ? "Finding target…" : "Review selection"}</button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {target && <div className={styles.route}>
      <p><strong>{target.label}</strong> · <a href={target.url} target="_blank" rel="noreferrer">View on {route === "spotify_saved_track" ? "Spotify" : "YouTube"}</a></p>
      <p>{route === "spotify_saved_track" ? "Reclaim Verifier searches your Liked Songs for a dated save of this song, or a saved song associated with this artist." : route === "youtube_like" ? "Verify a source-recorded like of this exact video from Google My Activity. Only the loaded English activity page is searched; this does not prove a watch or your first-ever like. Phone and ownership acceptance are pending." : "Verify a dated subscription to this channel from Google My Activity. Only the loaded activity page is searched."} Reclaim processes the selected record and source-account information. Early stores the verified record privately; your full history is not published.</p>
      <p className={styles.meta}>We look for activity before the time you start verification. This is a support record, not a campaign qualification. A future campaign sets its own cutoff and reward rules.</p>
      <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I consent to verifying and privately saving this selected support record.</label>
      <button type="button" className={styles.button} disabled={busy || !consent} onClick={() => start({route,targetId:target.targetId,cutoff:new Date().toISOString()})}>{busy ? "Preparing verification…" : "Verify with Reclaim"}</button>
    </div>}
  </form>;
}

function RuleForm({ disabled, create }: { disabled: boolean; create: (r: Rule) => void }) {
  const [routes, setRoutes] = useState<RuleRoute[]>([{ route: "spotify_saved_track", targetId: "", cutoff: "" }]);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    create({ version: Number(f.get("version")), title: String(f.get("title")), alternatives: routes,
      payoutWei: parseEther(String(f.get("payout"))).toString(), capacity: Number(f.get("capacity")),
      claimExpiry: Math.floor(Date.parse(`${f.get("expiry")}Z`) / 1000), minimumDistinctEvents: Number(f.get("events")), minimumDistinctDays: Number(f.get("days")) });
  }
  return <form onSubmit={submit}>
    <div className={styles.row}><label className={styles.field}>Opportunity name<input name="title" required maxLength={100} /></label><label className={styles.field}>Claim window closes (UTC)<input type="datetime-local" name="expiry" required /></label></div>
    <label className={styles.field}>Rule version<input name="version" type="number" min="1" max="2147483647" defaultValue="1" required /></label>
    {routes.map((r, i) => <div key={i} className={styles.route}><div className={styles.row}>
      <label className={styles.field}>Accepted activity<select value={r.route} onChange={e => setRoutes(routes.map((v,j) => j===i ? {...v, route:e.target.value as RuleRoute["route"], targetId:""} : v))}><option value="spotify_saved_track">Spotify track save</option><option value="youtube_subscription">YouTube subscription</option><option value="youtube_like">YouTube video like · testing</option></select></label>
      <label className={styles.field}>Target ID<input required value={r.targetId} onChange={e => setRoutes(routes.map((v,j)=>j===i?{...v,targetId:e.target.value}:v))} placeholder={r.route === "spotify_saved_track" ? "spotify:artist:… or spotify:track:…" : r.route === "youtube_like" ? "11-character video ID" : "UC… channel ID"} /></label>
      <label className={styles.field}>Activity before (UTC)<input type="datetime-local" required onChange={e => setRoutes(routes.map((v,j)=>j===i?{...v,cutoff:e.target.value?`${e.target.value}:00Z`:""}:v))} /></label>
    </div>{routes.length>1 && <button className={`${styles.button} ${styles.secondary}`} type="button" onClick={()=>setRoutes(routes.filter((_,j)=>j!==i))}>Remove alternative</button>}</div>)}
    <p><button className={`${styles.button} ${styles.secondary}`} type="button" disabled={routes.length>=8} onClick={()=>setRoutes([...routes,{route:"youtube_subscription",targetId:"",cutoff:""}])}>Add alternative activity</button></p>
    <div className={styles.row}><label className={styles.field}>Payout per person (test MON)<input name="payout" type="number" step="0.000001" min="0.000001" defaultValue="0.01" required /></label><label className={styles.field}>Capacity<input name="capacity" type="number" min="1" max="1000000" defaultValue="10" required /></label></div>
    <div className={styles.row}><label className={styles.field}>Distinct events required<input name="events" type="number" min="1" max="100" defaultValue="1" required /></label><label className={styles.field}>Distinct UTC dates required<input name="days" type="number" min="1" max="100" defaultValue="1" required /></label></div>
    <p className={styles.meta}>Repeated copies of one event never increase support. Repeat-support collection coverage remains experimental.</p>
    <button className={styles.button} disabled={disabled}>Save immutable rule</button>
  </form>;
}
function FundingForm({ disabled, selectedRule, benefitSelected, transact }: { disabled: boolean; selectedRule: boolean; benefitSelected: boolean; transact: (kind:"create"|"fund"|"refund",amount?:string)=>void }) {
  const [amount,setAmount]=useState("0.1");
  return <div className={styles.route}><h3>Fund or close a benefit</h3><div className={styles.row}><label className={styles.field}>Funding amount (test MON)<input type="number" min="0" step="0.000001" value={amount} onChange={e=>setAmount(e.target.value)} /></label>
    <button className={styles.button} disabled={disabled || !selectedRule} onClick={()=>transact("create",amount)}>Create & fund selected rule</button>
    <button className={`${styles.button} ${styles.secondary}`} disabled={disabled || !benefitSelected} onClick={()=>transact("fund",amount)}>Add funding</button>
    <button className={`${styles.button} ${styles.secondary}`} disabled={disabled || !benefitSelected} onClick={()=>transact("refund")}>Refund after expiry</button></div></div>;
}
