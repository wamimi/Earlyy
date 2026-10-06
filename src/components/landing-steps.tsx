import { ArrowRight, Check, Heart, MessageCircle, ShieldCheck, LockKeyhole, ExternalLink } from "lucide-react";

function WindowBar() { return <div className="el-window-bar"><span><i /><i /><i /></span><small>early / your place in the story</small><ShieldCheck size={13} /></div>; }

export function LandingSteps() {
  return (
    <section className="el-how el-container" id="how">
      <div className="el-section-heading"><h2>Support is the beginning.<br />Recognition comes next.</h2><p>The experience we’re building, from showing up to being seen.</p></div>
      <div className="el-step-list">
        <article className="el-step">
          <div className="el-step-copy"><span className="el-step-number">STEP 01</span><h3>Start with the support<br />you’ve already given.</h3><p>The song you kept playing. The work you shared. The first purchase. A qualifying record is the starting point for recognizing your place in the story.</p><a href="/campaigns">Imagine a campaign <ArrowRight size={16} /></a></div>
          <div className="el-step-visual"><div className="el-demo-window"><WindowBar /><div className="el-post"><div className="el-post-person"><span className="el-avatar">a.</span><div><strong>A creator on the rise</strong><small>@a_new_voice</small></div><span className="el-x">↗</span></div><p>Something I’ve been working on.<br />Glad you’re here for the beginning.</p><div className="el-post-actions"><span><Heart size={16} fill="currentColor" /> You liked this</span><span><MessageCircle size={16} /> You replied</span></div></div><div className="el-demo-input"><span>A record of your support</span><ArrowRight size={17} /></div><small className="el-demo-label">Illustrative support · integrations in development</small></div></div>
        </article>
        <article className="el-step">
          <div className="el-step-copy"><span className="el-step-number">STEP 02</span><h3>Your support,<br />backed by evidence.</h3><p>With your permission, Early will verify qualifying facts at their source. Each integration will say precisely what its records can establish.</p><span className="el-step-assurance"><ShieldCheck size={17} /> Your login stays yours.</span></div>
          <div className="el-step-visual"><div className="el-verification-scene"><div className="el-source-mark">↗</div><div className="el-connection"><i /><i /><i /><i /><i /></div><div className="el-phone"><div className="el-phone-notch" /><span className="el-reclaim-mark">R</span><h4>Verify your moment</h4><p>Only the facts needed.<br />Always with your permission.</p><div><Check size={15} /><span>Original post</span></div><div><Check size={15} /><span>Qualifying support</span></div><div><Check size={15} /><span>Interaction time</span></div><span className="el-phone-confirm">Source verified <ShieldCheck size={14} /></span></div><span className="el-demo-label">Illustrative Reclaim verification</span></div></div>
        </article>
        <article className="el-step">
          <div className="el-step-copy"><span className="el-step-number">STEP 03</span><h3>Keep your place.<br />See what it opens.</h3><p>Participating creators and businesses can offer access, rewards, or benefits to qualifying supporters. You choose which facts to share; each campaign defines what’s available.</p><a href="#privacy">Explore the two paths <ArrowRight size={16} /></a></div>
          <div className="el-step-visual"><div className="el-receipt-demo"><div className="el-receipt-heading"><span>Early</span><ShieldCheck size={20} /></div><small>RECORD OF SUPPORT</small><h4>You were here<br />before the crowd.</h4><div className="el-receipt-fact"><span>Source</span><strong>Verified support</strong></div><div className="el-receipt-fact"><span>Verification</span><strong>Reclaim</strong></div><div className="el-receipt-dashed" /><div className="el-receipt-options"><span><ExternalLink size={14} /> Public receipt</span><span><LockKeyhole size={14} /> Private vault</span></div></div><span className="el-demo-label">Illustrative receipt · your proof, your choice</span></div>
        </article>
      </div>
    </section>
  );
}
