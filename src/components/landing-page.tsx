"use client";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, LockKeyhole } from "lucide-react";
import { SiteHeader } from "./site-header";
import { LandingFooter } from "./landing-footer";
import { LandingSteps } from "./landing-steps";
import { ImagePortalHero } from "./ui/image-portal-hero";
import "./landing.css";

const faqs = [
  { question: "What is Early?", answer: "A registry of meaningful support. We’re building a way for fans and customers to verify that they showed up, and for creators and businesses to recognize that contribution with access, rewards, and opportunity." },
  { question: "Do I have to be the very first?", answer: "No. Being early needs a reference point: a first release, a launch, or a date chosen by a creator. Each campaign will set clear rules for what qualifies." },
  { question: "Can past support count?", answer: "That’s part of the vision. It depends on whether a platform or business still holds a record we can verify. A memory matters, but a proof needs evidence." },
  { question: "What could I receive?", answer: "A place at a show, a limited release, a product credit, or another benefit offered by a participating creator or business. Financial rewards may be part of a campaign, but support alone never guarantees a payout or an ownership right." },
  { question: "Can I use Early today?", answer: "We’re developing the product and gathering feedback. Public verification and reward campaigns have not launched. Platform coverage and availability will be announced as each integration is ready." },
  { question: "How will my history be protected?", answer: "Our approach combines verifiable records with private eligibility checks. Public receipts can disclose selected facts. The current private prototype uses a trusted attestor that sees verified facts before encryption; privacy does not mean complete anonymity." },
];
export function LandingPage() {
  return <main className="early-landing">
    <SiteHeader />
    <ImagePortalHero><div className="el-hero-actions"><Link className="el-primary" href="#how">Explore Early <ArrowUpRight size={18} /></Link><Link className="el-secondary" href="/campaigns">Recognize your supporters <ArrowUpRight size={16} /></Link></div><p className="el-hero-hint">Taking shape with fans, creators, and businesses.</p></ImagePortalHero>
    <section className="el-platforms el-container" aria-label="Where support begins"><p>Culture grows wherever people show up.</p><div>{['Music','Creators','Communities','Brands'].map(name => <span key={name}><strong>{name}</strong></span>)}</div></section>
    <section className="el-story el-container"><h2>Before there was a crowd,<br />there was you.</h2><p>You played the song. Shared the work. Tried the first version. Those small acts helped something find its feet. Early is being built so the people who helped create that value can share in what follows.</p></section>
    <LandingSteps />
    <section className="el-privacy" id="privacy"><div className="el-container"><div className="el-section-heading"><h2>Recognition shouldn’t cost<br />your whole history.</h2><p>A creator may need to know you were there. They don’t need to know everywhere else you’ve been.</p></div><div className="el-privacy-paths"><article><ShieldCheck size={24}/><h3>A record you can stand behind.</h3><p>Verifiable support gives your story something stronger than a screenshot. Our public receipt approach lets selected facts be checked independently.</p><Link href="/developers">How verification is designed <ArrowUpRight size={17}/></Link></article><article><LockKeyhole size={24}/><h3>The answer, without the archive.</h3><p>We’re developing private checks that can tell a campaign whether you qualify while keeping your accumulated history encrypted.</p><Link href="/developers#privacy">Understand the privacy boundary <ArrowUpRight size={17}/></Link></article></div></div></section>
    <section className="el-teams el-container" id="teams"><div className="el-section-heading"><h2>Let your first people<br />into your next chapter.</h2><p>For the people making culture, building businesses,<br />and remembering who helped them get here.</p></div><div className="el-team-rows">{[{name:'Artists & creators',copy:'Turn day-one support into closer connections, special access, and shared moments.'},{name:'Brands & businesses',copy:'Recognize the customers who took a chance before the reviews were in.'},{name:'Builders',copy:'Create experiences where participation carries a verifiable record.'}].map((item,i)=><article key={item.name}><h3>{item.name}</h3><p>{item.copy}</p><Link href={i===2?'/developers':'/campaigns'} aria-label={`Explore Early for ${item.name}`}><ArrowUpRight size={20}/></Link></article>)}</div></section>
    <section className="el-faq el-container" id="faq"><h2>A few things to know.</h2><div>{faqs.map(faq=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section><LandingFooter/>
  </main>;
}
