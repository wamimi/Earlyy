import Link from "next/link";
import { ArrowRight, Link as LinkIcon } from "lucide-react";
import type { RouteId } from "@/lib/early/model";
import s from "./fan-dashboard.module.css";

export const supportProviders = [
  { route: "spotify_saved_track", platform: "Spotify", title: "Saved a song", description: "Verify a dated save from your Liked Songs.", linkType: "Track or artist link", action: "Verify saved song" },
  { route: "youtube_subscription", platform: "YouTube", title: "Subscribed to a channel", description: "Verify a dated channel subscription.", linkType: "Channel link", action: "Verify subscription" },
  { route: "youtube_like", platform: "YouTube", title: "Liked a video", description: "Verify a dated like of one exact video.", linkType: "Video link", action: "Verify video like" },
] as const satisfies readonly { route: RouteId; platform: string; title: string; description: string; linkType: string; action: string }[];

export function PlatformLogo({ platform }: { platform: "Spotify" | "YouTube" }) {
  return platform === "Spotify" ? <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <circle cx="32" cy="32" r="32" fill="#1ed760" />
    <g fill="none" stroke="#fff" strokeLinecap="round">
      <path d="M15 23c12-4 25-3 36 3" strokeWidth="5" />
      <path d="M17 33c10-3 21-2 30 3" strokeWidth="4" />
      <path d="M19 43c8-2 17-1 24 3" strokeWidth="3.5" />
    </g>
  </svg> : <svg viewBox="0 0 72 64" aria-hidden="true" focusable="false">
    <rect x="1" y="8" width="70" height="48" rx="13" fill="#ff0033" />
    <path d="m29 21 20 11-20 11Z" fill="#fff" />
  </svg>;
}

export function SupportProviders() {
  return <section id="providers" className={s.platformSection} aria-labelledby="providers-title">
    <div className={s.sectionHeading}><h2 id="providers-title">Starting with the places you love.</h2><span className={s.badge}>Testing</span></div>
    <div className={s.providerCards}>{supportProviders.map(provider => <article className={s.providerCard} key={provider.route}>
      <div className={s.providerLogo}><PlatformLogo platform={provider.platform} /></div>
      <h3>{provider.title}</h3>
      <p className={s.providerPlatform}>{provider.platform}</p>
      <p className={s.providerDescription}>{provider.description}</p>
      <div className={s.providerActions}>
        <span className={s.providerLinkType}><LinkIcon size={14} />{provider.linkType}</span>
        <Link className={s.primary} href={`/rewards?activity=${provider.route}#save-support`}>{provider.action}<ArrowRight size={16} /></Link>
      </div>
    </article>)}</div>
    <p className={s.footnote}>Each activity is verified separately. Campaign eligibility is checked later. Testnet rewards require an available funded campaign.</p>
  </section>;
}
