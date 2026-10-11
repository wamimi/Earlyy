import Link from "next/link";
import { ArrowRight, Compass, Gift, History, UserRound } from "lucide-react";
import { EarlyLogo } from "@/components/early-logo";
import s from "./fan-dashboard.module.css";

type DashboardView = "discover" | "support" | "account";
export function DashboardSidebar({ active, navigate }: { active: DashboardView | "rewards"; navigate?: (view: DashboardView) => void }) {
  return <aside className={s.sidebar}>
    <Link href="/" className={s.logo} aria-label="Early home"><EarlyLogo /></Link>
    <span className={s.network}><span /> Monad testnet</span>
    <nav className={s.nav} aria-label="Fan navigation">
      <Link href="/dashboard" aria-current={active === "discover" ? "page" : undefined} onClick={() => navigate?.("discover")}><Compass size={19} />Discover</Link>
      {navigate ? <button aria-current={active === "support" ? "page" : undefined} onClick={() => navigate("support")}><History size={19} />My support</button> : <Link href="/dashboard#support"><History size={19} />My support</Link>}
      <Link href="/rewards" aria-current={active === "rewards" ? "page" : undefined}><Gift size={19} />Rewards<ArrowRight size={14} className={s.navArrow} /></Link>
    </nav>
    <div className={s.sidebarBottom}><p>Good taste.<br />A lasting record.</p>{navigate ? <button className={active === "account" ? s.activeAccount : ""} onClick={() => navigate("account")}><UserRound size={19} />Account</button> : <Link href="/dashboard#account"><UserRound size={19} />Account</Link>}</div>
  </aside>;
}
