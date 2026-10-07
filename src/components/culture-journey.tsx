import Image from "next/image";
import { ArrowUpRight, Check, Heart, Users } from "lucide-react";
import { ScrollPanels } from "./scroll-panels";

export function CultureJourney() {
  return <ScrollPanels id="culture" musicPortal panels={[
    { name: 'Music', content: null },
    { name: 'Creators', content: <>
      <div className="el-chapter-copy"><span>Creators</span><h2>Find your first people.<br />Bring them closer.</h2><p>Recognize the supporters behind your growth. Offer exclusive releases, invitations, and experiences that keep them connected.</p></div>
      <div className="el-chapter-visual el-creator-visual"><Image src="/creator-free-ticket.jpg" alt="An artist promises an early supporter a future free ticket" width={900} height={463} sizes="(max-width: 760px) 90vw, 45vw" /><div className="el-creator-note"><Heart size={21}/><span>Early support can become<br /><strong>a lasting connection.</strong></span></div></div>
    </> },
    { name: 'Communities', content: <>
      <div className="el-chapter-copy"><span>Communities</span><h2>Participation deserves<br />a place in the story.</h2><p>Give the people who show up a record of their contribution and a path to member access, recognition, and community rewards.</p></div>
      <div className="el-chapter-visual el-community-visual"><div className="el-community-board"><Users size={32}/><h3>The people who<br />made it happen.</h3><div className="el-member-portraits" aria-hidden="true">{['A','M','J','S','K'].map(n=><span key={n}>{n}</span>)}</div><div className="el-contribution"><Check size={18}/><span>Contributed before launch</span></div><div className="el-contribution"><Check size={18}/><span>Recognized by the community</span></div><p>Belonging, backed by participation.</p></div></div>
    </> },
    { name: 'Brands', content: <>
      <div className="el-chapter-copy"><span>Brands</span><h2>First customers.<br />Lasting loyalty.</h2><p>Find the customers who took a chance early. Give them meaningful benefits and a reason to keep coming back.</p><a href="/campaigns">Explore campaign ideas <ArrowUpRight size={18}/></a></div>
      <div className="el-chapter-visual el-brand-visual"><div className="el-brand-pass"><span>Early / founding customer</span><h3>You were there<br />from day one.</h3><div className="el-pass-stamp">First<br />edition</div><p>Priority access · Member benefits</p><div className="el-pass-bottom"><strong>A little recognition.<br />A reason to return.</strong><ArrowUpRight size={30}/></div></div></div>
    </> },
  ]}/>;
}
