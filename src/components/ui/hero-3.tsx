"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, ArrowDown } from "lucide-react";
import { useState, type ReactNode } from "react";

// Adapted from the AnimatedMarqueeHero supplied in the user's 21st.dev reference.
// One complete repeated group makes the image rail loop without a visible jump.
type MarqueeImage = { src: string; alt: string; caption: string };
interface AnimatedMarqueeHeroProps {
  tagline: string;
  title: ReactNode;
  description: string;
  images: MarqueeImage[];
  children: ReactNode;
}

export function AnimatedMarqueeHero({ tagline, title, description, images, children }: AnimatedMarqueeHeroProps) {
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  return (
    <section className="el-hero" id="top">
      <motion.div className="el-hero-copy" initial={reducedMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <p className="el-tagline"><span />{tagline}</p>
        <h1>{title}</h1>
        <p className="el-hero-description">{description}</p>
        {children}
      </motion.div>
      <div className="el-marquee" data-paused={paused || Boolean(reducedMotion)} aria-label="Moments from creators and their early supporters">
        <div className="el-marquee-track">
          {[0, 1].map((group) => (
            <div className="el-marquee-group" key={group} aria-hidden={group === 1 ? true : undefined}>
              {images.map((item, index) => (
                <figure className={`el-media el-media-${index % 4}`} key={`${group}-${item.src}`}>
                  <Image src={item.src} alt={group === 0 ? item.alt : ""} width={450} height={560} priority={group === 0} />
                  <figcaption>{item.caption}<span>↗</span></figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="el-hero-bottom">
        <span>Good taste deserves a receipt.</span>
        <a href="#how">See how it works <ArrowDown size={15} /></a>
        {!reducedMotion && <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Play image animation" : "Pause image animation"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>}
      </div>
    </section>
  );
}
