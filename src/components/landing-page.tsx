import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { SiteHeader } from "./site-header";
import { LandingFooter } from "./landing-footer";
import { LandingSteps } from "./landing-steps";
import { CultureJourney } from "./culture-journey";
import { ImagePortalHero } from "./ui/image-portal-hero";
import "./landing.css";

const faqs = [
  { question: "What is Early?", answer: "Early is an early-supporter registry. It helps fans and customers prove their support, and gives creators, communities, and businesses a way to recognize it with access and rewards." },
  { question: "Do I have to be the very first?", answer: "No. Each campaign defines what being early means and which activity qualifies." },
  { question: "Can past support count?", answer: "Yes, where a source still holds a record we can verify. You can currently verify a Spotify saved song, a YouTube channel subscription, or a YouTube video like." },
  { question: "What could I receive?", answer: "Tickets, exclusive access, member benefits, product credits, or financial rewards offered by a campaign. Benefits vary; verified support does not guarantee a payout or ownership." },
  { question: "Can I use Early today?", answer: "Yes. Testing is open to everyone. Open Early, sign in, and choose one of the three available providers. Rewards use Monad testnet and depend on a qualifying funded campaign." },
  { question: "Does Early see my Spotify or Google login details?", answer: "No. You sign in to the source through Reclaim Verifier; your source-account password and session credentials are not shared with Early as part of the proof. You review what a provider requests before sharing. Signing in to Early is separate and uses Privy." },
  { question: "How does Reclaim protect my privacy?", answer: "Early uses Reclaim’s zkTLS, which combines secure website connections with zero-knowledge proofs to check that selected information came from the source. Credentials and unrelated source data can remain hidden while the facts needed for verification are disclosed. For example, a YouTube like proof verifies a record for one selected video and its date; it does not give Early access to your full watch history." },
  { question: "What does Early receive and keep?", answer: "Early receives the proof and the facts required by the selected provider, such as the activity, video, channel or track identifiers, its recorded date, and a source-account identifier used to prevent reuse across accounts. It also processes your Early account, wallet and verification-session information. Accepted evidence is saved privately, and retained proof payloads are encrypted in storage. Privacy means limiting disclosure, not that Early receives no information about you." },
  { question: "Is my support history public?", answer: "Early keeps source activity records and proof payloads off-chain; it does not publish your full Spotify or Google history. If you claim a blockchain reward, your wallet address, transaction and reward amount are public. The original source service still knows the activity recorded on its own platform." },
];
export function LandingPage() {
  return <main className="early-landing">
    <SiteHeader />
    <ImagePortalHero><div className="el-hero-actions"><Link className="el-primary" href="/dashboard">Try Early <ArrowUpRight size={18} /></Link><Link className="el-secondary" href="/brands#planner">For creators & businesses <ArrowUpRight size={16} /></Link></div></ImagePortalHero>
    <CultureJourney/>
    <LandingSteps />
    <section className="el-privacy el-privacy-simple" id="privacy"><div className="el-container"><ShieldCheck size={34}/><h2>Your proof.<br />Your privacy.</h2><p>Reclaim’s zkTLS proves the facts needed to verify your support without sharing your login credentials with Early. You review what gets shared.</p><Link href="/privacy">How privacy works <ArrowUpRight size={17}/></Link></div></section>
    <section className="el-teams el-container" id="teams"><div className="el-value-heading"><h2>Value for both sides.</h2><Link href="/campaigns">Explore campaigns <ArrowUpRight size={18}/></Link></div><div className="el-value-rows">{[{name:'Supporters',copy:'Make your early support count toward access and rewards.'},{name:'Creators',copy:'Find your first fans. Build closer relationships.'},{name:'Businesses',copy:'Recognize early customers. Give them a reason to return.'}].map(item=><article key={item.name}><h3>{item.name}</h3><p>{item.copy}</p></article>)}</div></section>
    <section className="el-faq el-container" id="faq"><h2>Frequently asked questions</h2><div>{faqs.map(faq=><details key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
    <section className="el-closing el-container"><div><h2>Been there since<br />the beginning?</h2><p>Make your support count.</p><Link className="el-primary" href="/dashboard">Open Early <ArrowUpRight size={20}/></Link></div><Image src="/early-birds.jpg" alt="Watercolour birds gathered together among green branches" width={1408} height={1767} sizes="(max-width: 760px) 90vw, 45vw"/></section>
    <LandingFooter/>
  </main>;
}
