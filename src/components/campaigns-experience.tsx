"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowRight, Gift, Search, ShieldCheck, Users, X } from "lucide-react";
import { SiteHeader } from "./site-header";
import { LandingFooter } from "./landing-footer";

type Opportunity = { title: string; copy: string; image: string; reward: string; criteria: string };
const catalogue: Record<string, Opportunity[]> = {
  Music: [
    { title: "Concert access", copy: "You found the artist early. Get closer to the music.", image: "concert", reward: "Reserved tickets, backstage experiences, or a private listening session.", criteria: "Early listening or support that meets an artist’s campaign criteria." },
    { title: "Merch & more", copy: "Back the next release. Unlock something made for the first fans.", image: "merch", reward: "Limited merchandise, release access, or artist-funded cash rewards.", criteria: "Qualifying support for a release or artist before the campaign’s cutoff." },
    { title: "Points to products", copy: "Make your support count towards your next favourite find.", image: "records", reward: "Campaign points redeemable for music, merchandise, or products.", criteria: "Verified participation in the activities a campaign recognises." },
  ],
  Brands: [
    { title: "First in. First access.", copy: "Tried it before the reviews? Be first for what comes next.", image: "merch", reward: "Early product access, limited merchandise, or invitations to a launch.", criteria: "A qualifying purchase or participation before a brand’s campaign cutoff." },
    { title: "Loyalty that returns", copy: "Turn your customer history into benefits worth coming back for.", image: "records", reward: "Product credits, redeemable points, or campaign-funded cash rewards.", criteria: "Purchase or loyalty activity that meets the brand’s published criteria." },
    { title: "Beyond the checkout", copy: "Meet the people and experiences behind the brands you back.", image: "concert", reward: "Event invitations, community experiences, or exclusive product drops.", criteria: "Verified early customer activity selected by the brand." },
  ],
  Communities: [
    { title: "Your people. Your place.", copy: "Helped build the community? Have a place in its next chapter.", image: "concert", reward: "Invitations to gatherings, member experiences, or community roles.", criteria: "Contributions or membership that meet the community’s campaign criteria." },
    { title: "Made for the members", copy: "Carry a piece of the community you helped bring together.", image: "merch", reward: "Member merchandise, limited releases, or contributor benefits.", criteria: "Qualifying contributions to a participating community." },
    { title: "Participation pays back", copy: "Give the time you put in a tangible return.", image: "records", reward: "Community points, product benefits, or contributor rewards.", criteria: "Verified participation in the activities the community recognises." },
  ],
};
const steps = [
  { icon: Search, title: "Find", copy: "Choose a campaign from an artist, brand, or community you support." },
  { icon: ShieldCheck, title: "Verify", copy: "Use Reclaim to prove the specific activity the campaign needs." },
  { icon: Users, title: "Qualify", copy: "See whether your verified support meets the campaign criteria." },
  { icon: Gift, title: "Claim", copy: "Visit your dashboard for the perks and rewards you qualify for." },
];

export function CampaignsExperience() {
  const [category, setCategory] = useState("Music");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const details = useRef<HTMLDialogElement>(null);
  const opportunities = catalogue[category];
  function openDetails(opportunity: Opportunity) {
    setSelected(opportunity);
    details.current?.showModal();
  }
  const createAction = <a className="cp-button cp-button-coral cp-header-create" href="/waitlist?interest=creator">Join as a creator <ArrowRight size={16} /></a>;
  return (
    <main className="product-main campaigns-page" id="top">
      <section className="cp-hero">
        <Image className="cp-hero-background" src="/campaigns/background.png" alt="" fill priority sizes="100vw" />
        <SiteHeader action={createAction} />
        <div className="cp-container cp-hero-content">
          <h1>Your support<br />opens doors.</h1>
          <p>Discover what your early support could unlock.</p>
          <div className="cp-actions"><a className="cp-button cp-button-coral" href="#opportunities">Explore campaigns <ArrowRight size={18} /></a><a className="cp-button cp-button-outline" href="/waitlist?interest=creator">Campaign creation coming soon <ArrowRight size={18} /></a></div>
        </div>
      </section>

      <section className="cp-container cp-opportunities" id="opportunities" aria-labelledby="opportunities-heading">
        <div className="cp-section-top"><div><h2 id="opportunities-heading">Find your next opportunity.</h2><p>Campaigns are coming soon. Discover the rewards creators and brands can offer.</p></div><div className="cp-filters" role="group" aria-label="Campaign categories">{Object.keys(catalogue).map(item => <button key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
        <div className="cp-catalogue" key={category}>{opportunities.map((item, index) => <button className={`cp-opportunity cp-opportunity-${index + 1}`} key={item.title} onClick={() => openDetails(item)} aria-label={`Explore ${item.title}`}><div className="cp-card-image"><Image src={`/campaigns/${item.image}.png`} alt={item.image === "concert" ? "Fans sharing a live concert moment" : item.image === "merch" ? "Limited merchandise beside a record collection" : "Browsing vinyl at an independent record shop"} fill sizes={index === 0 ? "(max-width: 700px) 100vw, 40vw" : "(max-width: 700px) 100vw, 50vw"} /></div><div className="cp-card-copy"><div><h3>{item.title}</h3><p>{item.copy}</p></div><span className="cp-round-arrow"><ArrowRight size={22} /></span></div></button>)}</div>

        <article className="cp-featured">
          <div className="cp-featured-copy"><span className="cp-eyebrow">Reward spotlight</span><h2>{category === "Music" ? <>Be closer to<br />the music.</> : category === "Brands" ? <>Your loyalty.<br />A real return.</> : <>More than<br />a member.</>}</h2><p>{category === "Music" ? "From the first listen to the live moment. Your early support could bring you closer." : category === "Brands" ? "The brands you backed can give your support a tangible return." : "The people who helped build a community deserve a place in what comes next."}</p><dl className="cp-facts"><div><Users /><dt>Who qualifies</dt><dd>{opportunities[0].criteria}</dd></div><div><Gift /><dt>What you receive</dt><dd>{opportunities[0].reward}</dd></div><div><ShieldCheck /><dt>What you share</dt><dd>Only the facts needed to verify your eligibility.</dd></div></dl><button className="cp-text-link" onClick={() => openDetails(opportunities[0])}>Explore this opportunity <ArrowRight size={18} /></button></div>
          <div className="cp-featured-image"><Image src={`/campaigns/${category === "Music" ? "tickets" : opportunities[0].image}.png`} alt={category === "Music" ? "Friends holding all-access concert passes" : category === "Brands" ? "Merchandise from an independent release" : "A crowd coming together through music"} fill sizes="(max-width: 700px) 100vw, 50vw" /></div>
        </article>
      </section>

      <section className="cp-container cp-how" aria-labelledby="campaign-how"><h2 id="campaign-how">A simple way to get involved.</h2><ol className="cp-steps">{steps.map(({ icon: Icon, title, copy }, index) => <li key={title}><div className="cp-step-icon"><Icon size={28} /><span>0{index + 1}</span></div><h3>{title}</h3><p>{copy}</p>{index < 3 && <ArrowRight className="cp-step-arrow" size={22} aria-hidden="true" />}</li>)}</ol></section>
      <section className="cp-container cp-final"><div><h2>Support what moves you.</h2><p>Find your people. Discover what comes next.</p></div><a className="cp-button cp-button-coral" href="/waitlist">Join the waitlist <ArrowRight size={18} /></a></section>
      <LandingFooter compact />

      <dialog className="cp-dialog" ref={details} onClick={event => { if (event.target === event.currentTarget) details.current?.close(); }} aria-labelledby="opportunity-title"><div className="cp-dialog-content"><button className="cp-dialog-close" aria-label="Close opportunity" onClick={() => details.current?.close()}><X /></button><span className="cp-eyebrow">{category} opportunity</span><h2 id="opportunity-title">{selected?.title}</h2><p>{selected?.copy}</p><dl><dt>Qualifying support</dt><dd>{selected?.criteria}</dd><dt>Potential rewards</dt><dd>{selected?.reward}</dd></dl><div className="cp-dialog-note"><ShieldCheck size={21} /><p>Artists, brands, and communities set their campaign’s criteria, rewards, and availability. Public campaigns haven’t launched yet.</p></div><button className="cp-button cp-button-green" onClick={() => details.current?.close()}>Keep exploring <ArrowRight size={18} /></button></div></dialog>

    </main>
  );
}
