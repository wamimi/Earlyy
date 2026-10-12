import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { EarlyLogo } from "@/components/early-logo";
import "@/components/not-found.css";

export default function NotFound() {
  return <main className="early-missing">
    <header><Link href="/" aria-label="Early home"><EarlyLogo /></Link><Link href="/dashboard">Open Early <ArrowUpRight size={16} /></Link></header>
    <section className="missing-scene" aria-labelledby="missing-title">
      <div className="missing-copy"><span className="missing-ticket">404 · A missing moment</span><h1 id="missing-title"><span>Ooooops,</span>A little too early<br />for this page.</h1><p>The curtain’s still down here. This link may have moved, or the page doesn’t exist.</p><div className="missing-actions"><Link className="missing-home" href="/"><ArrowLeft size={18} /> Back to Early</Link><Link href="/campaigns">Explore campaigns <ArrowUpRight size={17} /></Link></div></div>
      <div className="missing-art"><Image src="/early-404.png" alt="A paper bird carrying a coral 404 ticket outside a miniature stage with closed green curtains" width={1536} height={1024} priority sizes="(max-width: 760px) 100vw, 65vw" /></div>
    </section>
    <footer>Good taste. A lasting record.<Link href="/privacy">Your privacy matters <ArrowUpRight size={14} /></Link></footer>
  </main>;
}
