"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronRight, Copy, Database, FileCode2, Globe2, KeyRound, LockKeyhole, ShieldCheck, Star, Ticket, UserRound, Users } from "lucide-react";
import { SiteHeader } from "./site-header";
import { LandingFooter } from "./landing-footer";

const repository = "https://github.com/wamimi/Earlyy";
const blueprint = JSON.stringify({ source: "activity", verify: "proof", check: "eligibility", grant: "access" }, null, 2);
const flow = [
  { label: "Source activity", icon: UserRound },
  { label: "Verified proof", icon: ShieldCheck },
  { label: "Eligibility", icon: FileCode2 },
  { label: "Access", icon: KeyRound },
];
const useCases = [
  { title: "Ticket access", copy: "Reward real participation with early access and invitations.", image: "concert", icon: Ticket, status: "Access granted", proof: "Qualifying support before an artist’s campaign cutoff.", outcome: "Connect eligibility to a reserved ticket allocation or an invitation. The organiser sets availability and handles delivery." },
  { title: "Customer loyalty", copy: "Turn meaningful activity into ongoing rewards and benefits.", image: "loyalty", icon: Star, status: "Loyalty unlocked", proof: "Purchase or participation records that meet the campaign’s criteria.", outcome: "Use verified eligibility to offer product benefits, redeemable points, or a customer experience." },
  { title: "Community membership", copy: "Give your community a clear path from contribution to access.", image: "community", icon: Users, status: "Member access", proof: "A verifiable contribution or membership record from an approved source.", outcome: "Recognise contributors with access to gatherings, member experiences, or community roles." },
];
const resources = [
  { title: "Providers", copy: "Source requirements and verification configuration.", icon: Database, href: "/developers/docs#providers" },
  { title: "Claim schemas", copy: "Typed records, attestations, and authorisations.", icon: FileCode2, href: "/developers/docs#schemas" },
  { title: "Security", copy: "Verification rules and privacy boundaries.", icon: ShieldCheck, href: "/developers/docs#security" },
  { title: "Quickstart", copy: "Set up the project and explore the implementation.", icon: BookOpen, href: "/developers/docs#quickstart" },
];

export function DevelopersExperience() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copyState, setCopyState] = useState("");
  async function copyBlueprint() {
    try { await navigator.clipboard.writeText(blueprint); setCopyState("Flow blueprint copied."); }
    catch { setCopyState("Copy is unavailable. Select the blueprint text to copy it."); }
  }
  return (
    <main id="top" className="product-main developers-page">
      <section className="dv-hero"><Image className="dv-background" src="/developers/background.png" alt="" fill priority sizes="100vw" /><SiteHeader action={<a href="#docs" className="dv-button dv-light dv-header-docs">Explore docs <ArrowRight size={16} /></a>} /><div className="dv-container dv-hero-layout"><div className="dv-hero-copy"><span className="dv-eyebrow">For developers</span><h1>Put participation<br />to work.</h1><p>Build access and rewards around verified activity.</p><div className="dv-actions"><a className="dv-button dv-green" href="#docs">Explore the docs <ArrowRight size={18} /></a><a className="dv-button dv-outline" href={repository} target="_blank" rel="noreferrer">View source <FileCode2 size={19} /></a></div></div><ol className="dv-hero-flow" aria-label="Participation to access">{flow.map(({label, icon: Icon}, index) => <li key={label}><div><Icon size={27} /><span>{label}</span></div>{index < flow.length - 1 && <ArrowRight size={20} aria-hidden="true" />}</li>)}</ol></div></section>

      <section className="dv-container dv-intro" aria-labelledby="integration-heading"><div><span className="dv-eyebrow">A more useful internet</span><h2 id="integration-heading">From support to<br />something your<br />product can use.</h2><p>Turn real participation into credentials and experiences across your product.</p></div><div className="dv-code-panel"><div className="dv-code-top"><span>Integration flow</span><button onClick={() => void copyBlueprint()} aria-label="Copy flow blueprint">{copyState === "Flow blueprint copied." ? <Check size={18} /> : <Copy size={18} />}</button></div><div className="dv-code-body"><pre><code>{blueprint}</code></pre><ol className="dv-code-flow">{flow.map(({label, icon: Icon}) => <li key={label}><Icon size={18} /><span>{label}</span></li>)}</ol></div><p role="status" className="dv-copy-status">{copyState}</p></div></section>

      <section className="dv-container dv-usecases" aria-labelledby="usecases-heading"><h2 id="usecases-heading" className="dv-eyebrow">Popular use cases</h2>{useCases.map(({title, copy, image, icon: Icon, status, proof, outcome}, index) => <article className="dv-usecase" key={title}><button className="dv-usecase-toggle" aria-expanded={expanded === title} aria-controls={`usecase-${index}`} onClick={() => setExpanded(expanded === title ? null : title)}><span className={`dv-usecase-icon dv-usecase-icon-${index}`}><Icon size={32} /></span><div className="dv-usecase-copy"><h3>{title}</h3><p>{copy}</p></div><div className="dv-usecase-image"><Image src={`/developers/${image}.png`} alt={index === 0 ? "Fans at a live concert" : index === 1 ? "A customer using her phone in an independent café" : "Friends at a creative community gathering"} fill sizes="(max-width: 700px) 90vw, 40vw" /><div className="dv-access-preview" aria-hidden="true"><Icon size={22} /><span>{status}<i /><i /></span><CheckCircle2 size={18} /></div></div><ChevronRight className="dv-usecase-chevron" size={22} /></button><div id={`usecase-${index}`} className="dv-usecase-detail" hidden={expanded !== title}><div><span>What gets verified</span><p>{proof}</p></div><div><span>What you can build</span><p>{outcome}</p></div><a href={"/developers/docs#providers"} target="_blank" rel="noreferrer">Review source requirements <ArrowUpRight size={16} /></a></div></article>)}</section>

      <section className="dv-container dv-privacy" id="privacy" aria-labelledby="privacy-heading"><div className="dv-privacy-heading"><span className="dv-eyebrow">Privacy by design</span><h2 id="privacy-heading">Choose what<br />gets disclosed.</h2><p>Specify the facts your integration needs.</p></div><article className="dv-privacy-card dv-public"><Globe2 size={30} /><h3>Public receipts</h3><p>Make selected proof facts independently verifiable.</p><div className="dv-receipt-art" aria-hidden="true"><i /><i /><i /><i /><CheckCircle2 size={21} /></div></article><article className="dv-privacy-card dv-private"><LockKeyhole size={30} /><h3>Private eligibility</h3><p>Evaluate supported criteria with encrypted computation.</p><div className="dv-receipt-art" aria-hidden="true"><i /><i /><i /><i /><LockKeyhole size={21} /></div></article><p className="dv-boundary"><strong>Know the trust boundary.</strong> Public receipts expose selected proof fields in transaction calldata. The Early attestor sees verified plaintext before encryption; encrypted history and campaign computation are protected by FHE. <a href={"/developers/docs#privacy"} target="_blank" rel="noreferrer">Read the architecture <ArrowUpRight size={14} /></a></p></section>

      <section className="dv-container dv-docs" id="docs" aria-labelledby="docs-heading"><div className="dv-docs-heading"><span className="dv-eyebrow">Documentation</span><h2 id="docs-heading">Everything you need<br />to start building.</h2><p>Guides, references, and source code to explore the integration.</p></div><div className="dv-doc-resources">{resources.map(({title, copy, icon: Icon, href}) => <a href={href} key={title}><Icon size={27} /><h3>{title}</h3><p>{copy}</p><ArrowUpRight size={20} /></a>)}</div></section>
      <section className="dv-container dv-final"><div><span className="dv-eyebrow">Ready to build</span><h2>Build what comes next.</h2><p>Explore the docs, review the source, and start building.</p></div><div className="dv-actions"><a className="dv-button dv-light" href="#docs">Explore the docs <ArrowRight size={18} /></a><a className="dv-button dv-outline" href={repository} target="_blank" rel="noreferrer">View source <FileCode2 size={19} /></a></div></section>
      <section id="license" className="dv-container dv-license"><p>Early’s first-party source is licensed under Apache 2.0. Third-party dependencies retain their respective licenses.</p><a href={`${repository}/blob/main/LICENSE`} target="_blank" rel="noreferrer">View license <ArrowUpRight size={14} /></a></section>
      <LandingFooter compact />
    </main>
  );
}
