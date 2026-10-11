import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "./site-header";
import { LandingFooter } from "./landing-footer";
import { policyReady, publicSite } from "@/lib/public-site";
import "./policy-page.css";

export type PolicySection = { id: string; title: string; content: ReactNode };

export function PolicyPage({ title, intro, sections }: { title: string; intro: string; sections: PolicySection[] }) {
  return <main className="early-landing policy-page">
    <SiteHeader />
    <header className="policy-heading el-container">
      <Link href="/">Early / Trust & transparency</Link>
      <h1>{title}</h1><p>{intro}</p><small>Updated October 12, 2026 · Monad testnet beta</small>
      {!policyReady && <p className="policy-draft" role="status">Draft for review. Confirm the operator’s public details and review these policies before public launch.</p>}
    </header>
    <div className="policy-layout el-container">
      <nav className="policy-contents" aria-label={`${title} contents`}><h2>On this page</h2>{sections.map(section => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}<a href="#contact">Contact Early</a></nav>
      <article className="policy-copy">{sections.map(section => <section key={section.id} id={section.id}><h2>{section.title}</h2>{section.content}</section>)}
        <section id="contact"><h2>Contact Early</h2><p>{publicSite.operator ? `Early is operated by ${publicSite.operator}.` : "The operator’s public details are pending confirmation."}</p>
          {publicSite.supportEmail ? <p>For support, privacy requests or campaign questions, email <a href={`mailto:${publicSite.supportEmail}`}>{publicSite.supportEmail}</a>. Never send passwords, session cookies, private keys or raw proofs.</p> : <p>A monitored support address will be added before public launch. Do not post private account details or proofs in public issues.</p>}
        </section>
        <Link className="policy-return" href="/dashboard">Open Early <ArrowUpRight size={18} /></Link>
      </article>
    </div>
    <LandingFooter compact />
  </main>;
}
