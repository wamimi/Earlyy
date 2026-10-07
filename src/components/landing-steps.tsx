import Image from "next/image";
import { ArrowUpRight, ShieldCheck, Ticket, Music, Users, ShoppingBag, Gift, Coins, Banknote } from "lucide-react";
import { ScrollPanels } from "./scroll-panels";

export function LandingSteps() {
  return <ScrollPanels id="how" title="How it works" panels={[
    { name: '01 · Download', content: <>
      <div className="el-step-copy"><span className="el-step-number">STEP 01</span><h3>Download<br />Reclaim Verifier.</h3><p>Get the Reclaim Verifier app from the App Store or Google Play. It verifies your support without sharing your login credentials with Early.</p></div>
      <div className="el-step-visual el-install-visual"><div className="el-install-copy"><h4>Reclaim<br />Verifier</h4><p>Ready when you are.</p><div className="el-store-links"><a className="el-store-badge el-store-apple" href="https://apps.apple.com/app/reclaim-verifier/id6503247508" target="_blank" rel="noreferrer" aria-label="Download Reclaim Verifier on the App Store"><Image src="/store-badges-reference.png" alt="Download on the App Store" width={840} height={859}/></a><a className="el-store-badge el-store-google" href="https://play.google.com/store/apps/details?id=org.reclaimprotocol.app" target="_blank" rel="noreferrer" aria-label="Get Reclaim Verifier on Google Play"><Image src="/store-badges-reference.png" alt="Get it on Google Play" width={840} height={859}/></a></div></div><div className="el-real-reclaim-phone"><Image src="/reclaim-app-store-reference.png" alt="Reclaim Verifier shown in the iPhone App Store, with its actual app previews" fill sizes="1200px"/></div></div>
    </> },
    { name: '02 · Choose & verify', content: <>
      <div className="el-step-copy"><span className="el-step-number">STEP 02</span><h3>Choose a campaign.<br />Verify your support.</h3><p>Pick an artist, brand, or provider such as Spotify. Scan the QR code on your computer, or tap on mobile to open Reclaim and verify the activity a campaign requires.</p><span className="el-step-assurance"><ShieldCheck size={18}/> You choose what to share.</span></div>
      <div className="el-step-visual"><div className="el-source-selection"><h4>Find your next opportunity.</h4><p>Choose what your support could open.</p>{[{name:'Music',copy:'Listening history · Fan campaigns',icon:Music},{name:'Brands',copy:'Purchase history · Customer benefits',icon:ShoppingBag},{name:'Communities',copy:'Contributions · Member access',icon:Users}].map(({name,copy,icon:Icon})=><div key={name}><Icon size={24}/><span><strong>{name}</strong><small>{copy}</small></span><ArrowUpRight size={18}/></div>)}</div></div>
    </> },
    { name: '03 · View rewards', content: <>
      <div className="el-step-copy"><span className="el-step-number">STEP 03</span><h3>Return to your dashboard.<br />Discover your rewards.</h3><p>After verification, see what your support qualifies you for. Artists and brands set the offer: tickets, merch, cash, or points you can redeem for products.</p><a href="/campaigns">Explore campaign ideas <ArrowUpRight size={18}/></a></div>
      <div className="el-step-visual el-reward-visual"><div className="el-perks-dashboard"><div className="el-perks-top"><span>Early / Your dashboard</span><ShieldCheck size={22}/></div><h4>Your support.<br />More possibilities.</h4><div className="el-perk-options">{[{name:'Concert tickets',copy:'A place at the next show',icon:Ticket},{name:'Merch & products',copy:'Something worth keeping',icon:Gift},{name:'Redeemable points',copy:'Credit toward your next pick',icon:Coins},{name:'Cash rewards',copy:'A return on showing up',icon:Banknote}].map(({name,copy,icon:Icon})=><div key={name}><Icon size={23}/><strong>{name}</strong><span>{copy}</span></div>)}</div><p>Every campaign has its own rewards and eligibility rules.</p></div></div>
    </> },
  ]}/>;
}
