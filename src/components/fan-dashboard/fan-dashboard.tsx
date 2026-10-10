"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Compass, Gift, History, LockKeyhole, Music2, RefreshCw, ShieldCheck, Ticket, UserRound, Video } from "lucide-react";
import { formatEther } from "ethers";
import { useEarlyAuth } from "@/components/early-auth";
import { EarlyLogo } from "@/components/early-logo";
import { CampaignDetails } from "./campaign-details";
import { type Campaign, type Capability, type SupportRecord } from "./model";
import s from "./fan-dashboard.module.css";

type View = "discover" | "support" | "account";
export function FanDashboard({ campaignId }: { campaignId?: string }) {
  const auth = useEarlyAuth();
  return <Dashboard key={`${auth.walletAddress}:${auth.authenticated}`} campaignId={campaignId} />;
}
function Dashboard({ campaignId }: { campaignId?: string }) {
  const auth = useEarlyAuth();
  const [view, setView] = useState<View>("discover");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [access, setAccess] = useState<{userId:string;team:boolean;organizations:{id:string;name:string;kind:string}[]} | null>(null);
  const [records, setRecords] = useState<SupportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [platform, setPlatform] = useState<"all" | "spotify" | "youtube">("all");
  const { getAccessToken, walletAddress } = auth;
  const api = useCallback(async <T,>(operation: string, input: object = {}, signal?: AbortSignal): Promise<T> => {
    const token = await getAccessToken();
    const response = await fetch(`/api/early/${operation}`, { method: "POST", signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...input, wallet: walletAddress }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "We couldn’t complete that request. Please try again.");
    return data;
  }, [getAccessToken, walletAddress]);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    try {
      const [list, support] = await Promise.all([
        api<{ rules: Campaign[]; capabilities: Capability[]; access: {userId:string;team:boolean;organizations:{id:string;name:string;kind:string}[]} }>("list-rules", {}, signal),
        api<{ records: SupportRecord[] }>("evidence", {}, signal),
      ]);
      if (signal?.aborted) return;
      setAccess(list.access); setCampaigns(list.rules); setCapabilities(list.capabilities); setRecords(support.records); setLoaded(true);
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : "Couldn’t load your dashboard.");
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [api]);
  useEffect(() => {
    if (!auth.ready || !auth.authenticated || !auth.walletAddress) return;
    const controller = new AbortController();
    const timer = setTimeout(() => void load(controller.signal), 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [auth.ready, auth.authenticated, auth.walletAddress, load]);
  const selected = campaigns.find(c => c.id === campaignId);
  const connected = auth.authenticated && Boolean(auth.walletAddress);
  const visible = campaigns.filter(c => platform === "all" || c.definition.alternatives.some(a => platform === "spotify" ? a.route === "spotify_saved_track" : a.route === "youtube_subscription"));
  const Content = campaignId && view === "discover" ? "section" : "main";
  function navigate(next: View) { setView(next); }
  return <div className={s.shell}>
    <a className={s.skip} href={campaignId && view === "discover" ? "#campaign-content" : "#fan-content"}>Skip to content</a>
    <aside className={s.sidebar}>
      <Link href="/" className={s.logo} aria-label="Early home"><EarlyLogo /></Link>
      <span className={s.network}><span /> Monad testnet</span>
      <nav className={s.nav} aria-label="Fan navigation">
        <Link href="/dashboard" aria-current={view === "discover" ? "page" : undefined} onClick={() => navigate("discover")}><Compass size={19} />Discover</Link>
        <button aria-current={view === "support" ? "page" : undefined} onClick={() => navigate("support")}><History size={19} />My support</button>
        <Link href="/rewards"><Gift size={19} />Rewards<ArrowRight size={14} className={s.navArrow} /></Link>
      </nav>
      <div className={s.sidebarBottom}><p>Good taste.<br />A lasting record.</p><button className={view === "account" ? s.activeAccount : ""} onClick={() => navigate("account")}><UserRound size={19} />Account</button></div>
    </aside>
    <Content id="fan-content" className={s.main}>
      <header className={s.topbar}><span>Your corner of Early</span>{connected ? <span className={s.accountPill}><span />{auth.walletAddress.slice(0, 6)}…{auth.walletAddress.slice(-4)}</span> : <button className={s.smallButton} disabled={!auth.ready || !auth.configured} onClick={auth.login}>Sign in <ArrowRight size={15} /></button>}</header>
      {view === "discover" ? <>
        <div className={s.heading}><span className={s.eyebrow}>A little ahead. A little closer.</span><h1>Find your first campaign.</h1><p>Your past support could qualify.<br className={s.mobileBreak} /> Choose a campaign to see its rules.</p></div>
        {!connected ? <section className={s.welcome}><div className={s.ticketArt}><Ticket size={42} strokeWidth={1.3} /></div><div><span className={s.badge}>Made for your first moments</span><h2>You were there.<br />Make it count.</h2><p>Find opportunities, verify the support you choose, and keep a record that’s yours.</p><button className={s.primary} disabled={!auth.ready || !auth.configured} onClick={auth.login}>Sign in to explore <ArrowRight size={17} /></button>{!auth.ready ? <p role="status">Loading your account…</p> : !auth.configured ? <p>Sign-in is not available in this environment yet.</p> : auth.authenticated ? <p role="status">Your account wallet is getting ready.</p> : <small>No account history is shared when you sign in.</small>}</div></section> : <>
          <div className={s.sectionHeading}><h2>Campaigns</h2><button className={s.iconButton} disabled={loading} onClick={() => void load()} aria-label="Refresh campaigns"><RefreshCw size={17} /></button></div>
          <div className={s.filters} aria-label="Filter campaigns">{([['all','All platforms'],['spotify','Spotify'],['youtube','YouTube']] as const).map(([value,label]) => <button key={value} aria-pressed={platform === value} onClick={() => setPlatform(value)}>{label}</button>)}</div>
          {error ? <div className={s.error} role="alert"><strong>We couldn’t load your dashboard.</strong><p>{error}</p><button className={s.textButton} onClick={() => void load()}>Try again <RefreshCw size={14} /></button></div> : loading && !loaded ? <div className={s.skeleton} role="status">Loading campaigns…</div> : !visible.length ? <section className={s.empty}><Ticket size={30} strokeWidth={1.4} /><h3>{campaigns.length ? "No campaigns on this platform yet." : "Your first opportunity is on its way."}</h3><p>{campaigns.length ? "Try another platform to explore the available rules." : "Campaigns will appear here when organizers create their rules. Nothing to prove just yet."}</p>{platform !== "all" && <button className={s.textButton} onClick={() => setPlatform("all")}>Show all platforms <ArrowRight size={15} /></button>}</section> : <div className={s.campaignList}>{visible.map(c => <article key={c.id} className={s.campaign}><span className={s.campaignIcon}><Ticket size={25} /></span><div><span className={s.badge}>Rules ready · Funding unconfirmed</span><h3><Link href={`/dashboard/campaigns/${encodeURIComponent(c.id)}`}>{c.definition.title}</Link></h3><p>Organizer {c.creator_wallet.slice(0,6)}…{c.creator_wallet.slice(-4)}</p><span className={s.amount}>{formatEther(c.definition.payoutWei)} <span>test MON per eligible claim</span></span></div><Link className={s.smallButton} href={`/dashboard/campaigns/${encodeURIComponent(c.id)}`}>View campaign <ArrowRight size={15}/></Link></article>)}</div>}
        </>}
        <section className={s.supportSection}><div className={s.sectionHeading}><h2>Your support</h2><span className={s.private}><LockKeyhole size={13} />Private by default</span></div>{connected && (loading || !loaded || error) ? <p role="status" className={s.body}>{error ? "Your support records couldn’t be loaded. Refresh to try again." : "Loading your support…"}</p> : connected && records.length ? <><p className={s.body}>{records.length} verified {records.length === 1 ? "record" : "records"} in your archive. Each campaign checks its own rules.</p><button className={s.textButton} onClick={() => navigate("support")}>View my support <ArrowRight size={16} /></button></> : <div className={s.emptyCompact}><History size={26} strokeWidth={1.4}/><div><h3>{connected ? "No verified records yet." : "Your support has a history."}</h3><p>Only the activity you choose to prove becomes part of your record.</p></div></div>}</section>
        <section className={s.platformSection}><div className={s.sectionHeading}><h2>Starting with the places you love.</h2><span className={s.badge}>Testing</span></div><div className={s.platforms}><div><span className={s.spotify}><Music2 size={20}/></span><div><h3>Spotify</h3><p>Saved tracks and their artists</p></div></div><div><span className={s.youtube}><Video size={20}/></span><div><h3>YouTube</h3><p>Dated channel subscriptions</p></div></div></div><p className={s.footnote}>Verification is being tested. Reward claims open after the required acceptance checks.</p></section>
      </> : view === "support" ? <><div className={s.heading}><h1>My support.</h1><p>Meaningful moments, kept in one place.</p>{connected && <Link className={s.secondary} href="/rewards#save-support">Verify existing support <ArrowRight size={16}/></Link>}</div>{!connected ? <section className={s.empty}><LockKeyhole size={28}/><h2>Your archive is private.</h2><p>Sign in to see your verified support.</p><button className={s.primary} disabled={!auth.configured} onClick={auth.login}>Sign in</button></section> : error ? <p className={s.error} role="alert">{error}</p> : loading || !loaded ? <p role="status">Loading your support…</p> : !records.length ? <section className={s.empty}><History size={30}/><h2>No verified records yet.</h2><p>Verify existing Spotify or YouTube support now. A future campaign can evaluate the record with your consent.</p><Link className={s.primary} href="/rewards#save-support">Verify my support <ArrowRight size={16}/></Link></section> : <div className={s.records}>{records.map(r => <article key={r.id}><ShieldCheck size={23}/><div><h3>{r.platform === "spotify" ? "Saved track" : "Channel subscription"}</h3><p>{new Date(Number(BigInt(r.occurredAtMicros)/BigInt(1000))).toLocaleDateString("en-GB", {timeZone:"UTC",dateStyle:"long"})} · {r.platform === "spotify" ? "Spotify" : "YouTube"}</p><small>{r.targetId}</small></div><span className={s.badge}>Verified record</span></article>)}</div>}</> : <><div className={s.heading}><h1>Your account.</h1><p>A home for your support, connected to you.</p></div><section className={s.accountSection}><h2>Early account</h2>{connected ? <><p>{auth.displayName}</p>{access && <><p>Account ID: <span className={s.wallet}>{access.userId}</span></p>{access.organizations.map(o => <p key={o.id}>{o.name} · Approved {o.kind} partner</p>)}{(access.team || access.organizations.length > 0) && <Link className={s.secondary} href="/rewards">{access.team ? "Early campaign management" : "Partner workspace"}</Link>}</>}<label>Account wallet</label><p className={s.wallet}>{auth.walletAddress}</p><p className={s.footnote}>A connected wallet does not establish ownership of a Spotify or YouTube account. Platform-account ownership requires a separate verification check.</p><button className={s.secondary} onClick={() => void auth.logout().catch(() => setError("Couldn’t sign out. Please try again."))}>Sign out</button>{error && <p role="alert">{error}</p>}</> : <button className={s.primary} disabled={!auth.configured} onClick={auth.login}>Sign in</button>}</section></>}
      <footer className={s.footer}><ShieldCheck size={14}/> Your proof. Your choice.<Link href="/developers#privacy">How privacy works <ArrowRight size={13}/></Link></footer>
    </Content>
    {campaignId && view === "discover" && <CampaignDetails key={`${campaignId}:${auth.walletAddress}`} campaign={selected} loading={loading || !auth.ready} missing={loaded && !selected} error={error} connected={connected} capabilities={capabilities} api={api} onEvidence={() => void load()} />}
  </div>;
}
