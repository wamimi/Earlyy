import Link from "next/link";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { EarlyLogo } from "./early-logo";

export function LandingFooter({ compact = false }: { compact?: boolean } = {}) {
  return (
    <footer className={compact ? "el-footer cp-footer" : "el-footer"}>
      <div className="el-container el-footer-grid">
        {compact ? <div className="cp-footer-brand"><Link href="/" aria-label="Early home"><EarlyLogo /></Link></div> : <div className="el-newsletter"><h3>Newsletter</h3><p>A little ahead of the crowd.<br />Product news and moments worth finding.</p><div className="el-newsletter-field"><input type="email" aria-label="Newsletter email, subscriptions coming soon" placeholder="Enter your email" disabled /><button type="button" disabled>Coming soon</button></div><small>Newsletter sign-ups open with our launch.</small></div>}
        <nav aria-label="Product"><h3>Product</h3><Link href="/#how">How it works</Link><Link href="/#culture">Explore Early</Link><Link href="/campaigns">Campaigns</Link><Link href="/brands">Brands</Link><Link href="/#teams">For teams</Link><Link href="/developers">Developers</Link><Link href="/#privacy">Privacy</Link><Link href="/#faq">FAQ</Link><Link href="/developers#license">Apache 2.0</Link></nav>
        <nav aria-label="Company"><h3>Company</h3><span aria-disabled="true" title="Policy link to be provided">Privacy policy</span><span aria-disabled="true" title="Terms link to be provided">Terms of service</span></nav>
        <nav aria-label="Connect"><h3>Connect</h3><span aria-disabled="true" title="Official profile to be provided">X</span><span aria-disabled="true" title="Official community to be provided">Telegram</span><a href="https://github.com/wamimi/Earlyy" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={15}/></a></nav>
      </div>
      {!compact && <div className="el-container el-footer-signoff"><Link href="/" className="el-footer-wordmark" aria-label="Early home"><EarlyLogo /></Link><p>Early support.<br />Lasting recognition.</p><a href="#top" aria-label="Back to top"><ArrowUp size={22} /></a></div>}
      <div className="el-container el-footer-bottom"><span>© 2026 Early. All rights reserved.</span></div>
    </footer>
  );
}
