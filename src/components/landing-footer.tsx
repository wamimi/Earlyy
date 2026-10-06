import Link from "next/link";
import { ArrowUpRight, ArrowUp } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="el-footer">
      <div className="el-container el-footer-grid">
        <div className="el-newsletter"><h3>Newsletter</h3><p>A little ahead of the crowd.<br />Product news and moments worth finding.</p><div className="el-newsletter-field"><input type="email" aria-label="Newsletter email — subscriptions coming soon" placeholder="Enter your email" disabled /><button type="button" disabled>Coming soon</button></div><small>Newsletter sign-ups open with our launch.</small></div>
        <nav aria-label="Product"><h3>Product</h3><Link href="/#how">How it works</Link><Link href="/proof">Create proof</Link><Link href="/vault">Private vault</Link><Link href="/campaigns">Campaigns</Link><Link href="/#faq">FAQ</Link></nav>
        <nav aria-label="Company"><h3>Company</h3><Link href="/#teams">For teams</Link><Link href="/developers">Developers</Link><Link href="/developers#license">Apache 2.0</Link></nav>
        <nav aria-label="Technology"><h3>Built with</h3><a href="https://reclaimprotocol.org" target="_blank" rel="noreferrer">Reclaim <ArrowUpRight size={15} /></a><a href="https://www.zama.ai" target="_blank" rel="noreferrer">Zama <ArrowUpRight size={15} /></a><span>Base</span></nav>
      </div>
      <div className="el-container el-footer-signoff"><Link href="/" className="el-footer-wordmark">Early<span>↗</span></Link><p>You knew.<br />Now you can prove it.</p><a href="#top" aria-label="Back to top"><ArrowUp size={22} /></a></div>
      <div className="el-container el-footer-bottom"><span>© 2026 Early. All rights reserved.</span><span>Base Sepolia + Zama Sepolia</span><span>Proof of discovery for the internet.</span></div>
    </footer>
  );
}
