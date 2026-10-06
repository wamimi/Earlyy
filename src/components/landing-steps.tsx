import { ArrowRight, Check, Heart, MessageCircle, ShieldCheck, LockKeyhole, ExternalLink } from "lucide-react";

function WindowBar() { return <div className="el-window-bar"><span><i /><i /><i /></span><small>early / proof of discovery</small><ShieldCheck size={13} /></div>; }

export function LandingSteps() {
  return (
    <section className="el-how el-container" id="how">
      <div className="el-section-heading"><h2>From “I was there”<br />to “here’s the proof.”</h2><p>One moment. Three steps. A receipt that stays yours.</p></div>
      <div className="el-step-list">
        <article className="el-step">
          <div className="el-step-copy"><span className="el-step-number">STEP 01</span><h3>Choose a moment<br />you found first.</h3><p>That post you liked. The creator you replied to. Paste the original X post to start turning your discovery into something verifiable.</p><a href="/proof">Try your first proof <ArrowRight size={16} /></a></div>
          <div className="el-step-visual"><div className="el-demo-window"><WindowBar /><div className="el-post"><div className="el-post-person"><span className="el-avatar">a.</span><div><strong>A creator on the rise</strong><small>@a_new_voice</small></div><span className="el-x">𝕏</span></div><p>Something I’ve been working on.<br />Glad you’re here for the beginning.</p><div className="el-post-actions"><span><Heart size={16} fill="currentColor" /> You liked this</span><span><MessageCircle size={16} /> You replied</span></div></div><div className="el-demo-input"><span>x.com/creator/status/…</span><ArrowRight size={17} /></div><small className="el-demo-label">Illustrative post · use your own X link</small></div></div>
        </article>
        <article className="el-step">
          <div className="el-step-copy"><span className="el-step-number">STEP 02</span><h3>A real interaction.<br />Verified at the source.</h3><p>Open Reclaim and approve the verification. It checks that your account liked and replied to the post, without sharing your password with Early.</p><span className="el-step-assurance"><ShieldCheck size={17} /> Your login stays yours.</span></div>
          <div className="el-step-visual"><div className="el-verification-scene"><div className="el-source-mark">𝕏</div><div className="el-connection"><i /><i /><i /><i /><i /></div><div className="el-phone"><div className="el-phone-notch" /><span className="el-reclaim-mark">R</span><h4>Verify your moment</h4><p>Only the facts needed.<br />Always with your permission.</p><div><Check size={15} /><span>Original post</span></div><div><Check size={15} /><span>Liked & replied</span></div><div><Check size={15} /><span>Interaction time</span></div><span className="el-phone-confirm">Source verified <ShieldCheck size={14} /></span></div><span className="el-demo-label">Illustrative Reclaim verification</span></div></div>
        </article>
        <article className="el-step">
          <div className="el-step-copy"><span className="el-step-number">STEP 03</span><h3>Keep the proof.<br />Choose what you share.</h3><p>Create a public receipt on Base, or keep your discovery in an encrypted vault. Build a history of being early, on your terms.</p><a href="#privacy">Explore the two paths <ArrowRight size={16} /></a></div>
          <div className="el-step-visual"><div className="el-receipt-demo"><div className="el-receipt-heading"><span>Early</span><ShieldCheck size={20} /></div><small>PROOF OF DISCOVERY</small><h4>You were here<br />before the crowd.</h4><div className="el-receipt-fact"><span>Source</span><strong>X interaction</strong></div><div className="el-receipt-fact"><span>Verification</span><strong>Reclaim</strong></div><div className="el-receipt-dashed" /><div className="el-receipt-options"><span><ExternalLink size={14} /> Public receipt</span><span><LockKeyhole size={14} /> Private vault</span></div></div><span className="el-demo-label">Illustrative receipt · your proof, your choice</span></div>
        </article>
      </div>
    </section>
  );
}
