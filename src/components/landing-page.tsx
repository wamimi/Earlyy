"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, ShieldCheck, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { SiteHeader } from "./site-header";
import { LandingFooter } from "./landing-footer";
import { LandingSteps } from "./landing-steps";
import { ImagePortalHero } from "./ui/image-portal-hero";
import "./landing.css";

const faqs = [
  {
    question: "What counts as an X proof?",
    answer:
      "Use a public X post where the same account both liked the post and replied directly to it. Early verifies the focal post, liked state, reply relationship, and reply time.",
  },
  {
    question: "What is public on Base?",
    answer:
      "The public receipt stores only your wallet, proof ID, platform, hashed subject and content IDs, provider hash, and verification time. The selected proof fields are still visible in transaction calldata.",
  },
  {
    question: "What stays private in the vault?",
    answer:
      "Your accumulated discovery timing and interaction counts remain encrypted. A campaign can reveal an eligibility result without publishing the history used to compute it.",
  },
  {
    question: "Does Early see my data?",
    answer:
      "Reclaim verifies the source without sharing your password. In V2, Early's attestor sees the verified plaintext before encrypting a private vault input. Brands and public observers do not.",
  },
  {
    question: "Which platforms work today?",
    answer:
      "X is the first live provider. YouTube is the next production provider, followed by more cultural and developer platforms.",
  },
] as const;

export function LandingPage() {
  const router = useRouter();
  const [xUrl, setXUrl] = useState("");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  function beginProof(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let valid = false;
    try {
      const parsed = new URL(xUrl.trim());
      valid = ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(parsed.hostname.toLowerCase()) && parsed.protocol === "https:" && /^\/[^/]+\/status\/\d+\/?$/.test(parsed.pathname);
    } catch { /* Show the inline URL error below. */ }
    if (!valid) { setError("Paste the URL of the original X post."); return; }
    setError("");
    router.push(`/proof?url=${encodeURIComponent(xUrl.trim())}`);
  }

  return (
    <main className="early-landing">
      <SiteHeader />
      <ImagePortalHero>
        <button className="el-primary" type="button" aria-expanded={formOpen} aria-controls="create-proof" onClick={() => setFormOpen(!formOpen)}>Create proof <ArrowUpRight size={18} /></button>
        <p className="el-hero-hint">Start with an X post you liked and replied to.</p>
        <form className="el-proof-form" id="create-proof" hidden={!formOpen} onSubmit={beginProof}>
          <label htmlFor="x-url">X post URL</label>
          <div><input id="x-url" value={xUrl} onChange={event => { setXUrl(event.target.value); setError(""); }} placeholder="https://x.com/creator/status/…" autoComplete="url" aria-invalid={Boolean(error)} aria-describedby={error ? "proof-error" : undefined} /><button type="submit" aria-label="Create an X proof">Create proof <ArrowRight size={16} /></button></div>
          {error && <p id="proof-error" role="alert">{error}</p>}
        </form>
      </ImagePortalHero>

      <section className="el-platforms el-container" aria-label="Platform availability"><p>Discovery happens everywhere. Our first proof starts on X.</p><div>{[{name:"X", status:"Live proof"},{name:"YouTube",status:"Next"},{name:"Instagram",status:"Planned"},{name:"Spotify",status:"Planned"},{name:"GitHub",status:"Planned"}].map(item => <span key={item.name}><strong>{item.name}</strong><small>{item.status}</small></span>)}</div></section>
      <LandingSteps />

      <section className="el-privacy" id="privacy"><div className="el-container"><div className="el-section-heading"><h2>Your proof.<br />Your choice.</h2><p>A moment can be verified without making your whole discovery history a public feed.</p></div><div className="el-privacy-paths"><article><ShieldCheck size={24} /><h3>A fact anyone can check.</h3><p>Create a public receipt on Base. Selected proof fields are visible in transaction data.</p><Link href="/proof">Public receipt <ArrowUpRight size={17} /></Link></article><article><LockKeyhole size={24} /><h3>A history nobody can browse.</h3><p>Keep accumulated discoveries encrypted with Zama. Campaigns can check eligibility without revealing that history to brands.</p><Link href="/vault">Private vault <ArrowUpRight size={17} /></Link></article></div></div></section>

      <section className="el-teams el-container" id="teams"><div className="el-section-heading"><h2>Being early should<br />mean something.</h2><p>A record for fans. Recognition for creators.<br />Verified discovery for the things you build.</p></div><div className="el-team-rows"><article><h3>Creators</h3><p>Recognize day-one fans with access, tickets, and loyalty.</p><Link href="/campaigns" aria-label="Explore creator campaigns"><ArrowUpRight size={20} /></Link></article><article><h3>Brands</h3><p>Run campaigns using verified timing instead of screenshots.</p><Link href="/campaigns" aria-label="Explore brand campaigns"><ArrowUpRight size={20} /></Link></article><article><h3>Developers</h3><p>Build with versioned providers and portable receipt schemas.</p><Link href="/developers" aria-label="Explore developer documentation"><ArrowUpRight size={20} /></Link></article></div></section>

      <section className="el-faq el-container" id="faq"><h2>Before you prove it.</h2><div>{faqs.map(faq => <details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
      <LandingFooter />
    </main>
  );
}
