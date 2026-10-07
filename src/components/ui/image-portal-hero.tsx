import Image from "next/image";
import { ArrowDown } from "lucide-react";
import type { ReactNode } from "react";

export function ImagePortalHero({ children }: { children: ReactNode }) {
  return <section className="el-opening" id="top" aria-label="Early, recognition for early support">
    <Image className="el-atmosphere" src="/hero-culture-light.png" alt="" fill sizes="100vw" priority/>
    <div className="el-hero-copy">
      <h1>Turn early support<br /><span>into rewards.</span></h1>
      <p className="el-hero-description">Prove you were there before the crowd.<br />Unlock recognition, special access, and campaign rewards.</p>
      {children}
    </div>
    <a className="el-opening-scroll" href="#culture">See what being early could open <ArrowDown size={17} /></a>
  </section>;
}
