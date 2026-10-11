"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Check, CalendarDays, CreditCard, Headphones, Heart, Mail, Package, Send, ShoppingBag, ShoppingCart, Star, Ticket, UserRound, Users } from "lucide-react";
import { SiteHeader } from "./site-header";
import { LandingFooter } from "./landing-footer";

const activities = [
  { label: "Make a purchase", icon: ShoppingCart },
  { label: "Stream or listen", icon: Headphones },
  { label: "Follow or subscribe", icon: UserRound },
  { label: "Join a waitlist", icon: Mail },
];
const rewards = [
  { label: "Tickets", icon: Ticket, description: "Reward top supporters with access to your next event." },
  { label: "Products", icon: ShoppingBag, description: "Offer exclusive merchandise your fans will actually want." },
  { label: "Points", icon: Star, description: "Give loyalty points redeemable for products or benefits." },
  { label: "Cash rewards", icon: CreditCard, description: "Set a reward budget for the people who backed you." },
];
const deliveries = [
  { label: "Send digitally", icon: Send },
  { label: "Ship a product", icon: Package },
  { label: "Send a payout", icon: CreditCard },
  { label: "Arrange collection", icon: UserRound },
];

export function BrandsExperience() {
  const [activity, setActivity] = useState("Make a purchase");
  const [reward, setReward] = useState("Tickets");
  const [delivery, setDelivery] = useState("Send digitally");
  const [cutoff, setCutoff] = useState("");
  return (
    <main id="top" className="product-main brands-page">
      <section className="br-hero">
        <Image src="/brands/hero-inner-circle.png" alt="" className="br-hero-image" fill priority sizes="100vw" />
        <SiteHeader action={<a className="br-button br-coral br-header-start" href="/dashboard">Open Early</a>} />
        <div className="br-container br-hero-copy"><span className="br-eyebrow">Early brands</span><h1>Reward the people<br />behind your growth.</h1><p>Turn verified support into tickets, products,<br className="br-desktop-break" /> points, and rewards.</p><div className="br-actions"><a className="br-button br-coral" href="/rewards">Campaign workspace <ArrowRight size={18} /></a><a className="br-button br-outline" href="#ideas">Explore ideas <ArrowRight size={18} /></a></div></div>
      </section>

      <section className="br-container br-rewards" id="ideas" aria-labelledby="reward-heading"><span className="br-eyebrow">Real ways to reward</span><h2 id="reward-heading">You set the offer.</h2><p className="br-lead">Turn support into what matters most for your audience.</p><div className="br-rewards-photo"><Image src="/brands/rewards-inner-circle.png" alt="Concert tickets, an Early sweatshirt, a loyalty points card, and a cash reward receipt" fill sizes="(max-width: 700px) 180vw, 90vw" /></div><div className="br-reward-descriptions">{rewards.map((item, index) => <div key={item.label}><div className="br-mobile-reward-image" style={{backgroundPosition: `${index * 100 / 3}% center`}} aria-hidden="true" /><h3>{item.label}</h3><p>{item.description}</p></div>)}</div></section>

      <section className="br-how" id="planner" aria-labelledby="brand-how"><div className="br-container"><span className="br-eyebrow">How it works</span><h2 id="brand-how">A campaign, on your terms.</h2><p className="br-lead">Define the criteria. Choose the reward. Plan delivery.</p><div className="br-builder">
        <fieldset className="br-build-step"><legend><span>1</span>Qualifying activity</legend><p>Choose the support you want to recognise.</p><div className="br-options">{activities.map(({label, icon: Icon}) => <label className={activity === label ? "is-selected" : ""} key={label}><input type="radio" name="activity" value={label} checked={activity === label} onChange={() => setActivity(label)} /><Icon size={18} /><span>{label}</span>{activity === label && <Check size={15} />}</label>)}</div></fieldset>
        <fieldset className="br-build-step br-date-step"><legend><span>2</span>Cutoff</legend><p>Set the moment that makes someone early.</p><div className="br-calendar-art" aria-hidden="true"><CalendarDays size={35} /><span>Before the crowd.</span><div>{Array.from({length:21}, (_, index) => <i className={cutoff && index + 1 === Number(cutoff.slice(-2)) ? "br-selected-day" : ""} key={index}>{index + 1}</i>)}</div></div><label className="br-date-label" htmlFor="eligibility-cutoff">Support before<input id="eligibility-cutoff" type="date" value={cutoff} onChange={event => setCutoff(event.target.value)} /></label></fieldset>
        <fieldset className="br-build-step"><legend><span>3</span>Reward type</legend><p>Pick what your supporters will receive.</p><div className="br-options">{rewards.map(({label, icon: Icon}) => <label className={reward === label ? "is-selected" : ""} key={label}><input type="radio" name="reward" value={label} checked={reward === label} onChange={() => {setReward(label); setDelivery(label === "Products" ? "Ship a product" : label === "Cash rewards" ? "Send a payout" : "Send digitally");}} /><Icon size={18} /><span>{label}</span>{reward === label && <Check size={15} />}</label>)}</div></fieldset>
        <fieldset className="br-build-step"><legend><span>4</span>Fulfilment</legend><p>Choose how rewards reach your supporters.</p><div className="br-options">{deliveries.map(({label, icon: Icon}) => <label className={delivery === label ? "is-selected" : ""} key={label}><input type="radio" name="delivery" value={label} checked={delivery === label} onChange={() => setDelivery(label)} /><Icon size={18} /><span>{label}</span>{delivery === label && <Check size={15} />}</label>)}</div></fieldset>
      </div><div className="br-builder-bottom"><p>Explore campaign ideas here. Supported verification routes and campaign permissions are shown in the workspace.</p><a className="br-text-button" href="/rewards">Open campaign workspace <ArrowRight size={18} /></a></div></div></section>

      <section className="br-recognition" aria-labelledby="recognition-heading"><div className="br-recognition-image"><Image src="/brands/bundle-inner-circle.png" alt="Early merchandise, a vinyl release, and membership passes arranged on emerald glass" fill sizes="(max-width: 700px) 100vw, 50vw" /></div><div className="br-recognition-copy"><span className="br-eyebrow">Built for lasting fans</span><h2 id="recognition-heading">Recognition<br />that brings<br />people back.</h2><div className="br-benefit"><span><Users size={30} /></span><div><h3>Make supporters feel seen.</h3><p>Turn meaningful support into memorable experiences.</p></div></div><div className="br-benefit"><span><Heart size={30} /></span><div><h3>Build deeper relationships.</h3><p>Give people more reasons to keep coming back.</p></div></div></div></section>

      <section className="br-final"><Image src="/brands/background.png" alt="" fill sizes="100vw" /><div className="br-container"><span className="br-eyebrow">Get started</span><h2>Give your first customers<br />a reason to return.</h2><div className="br-actions"><a className="br-button br-coral" href="/rewards">Campaign workspace <ArrowRight size={18} /></a><a className="br-button br-outline" href="#ideas">Explore ideas <ArrowRight size={18} /></a></div></div></section>
      <LandingFooter compact />


    </main>
  );
}
