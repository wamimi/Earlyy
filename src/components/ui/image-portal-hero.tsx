"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const ramp = (value: number, start: number, end: number) => Math.min(1, Math.max(0, (value - start) / (end - start)));

// The supplied Glyph Portal's pinned camera journey, adapted to a photographic
// frame. Scroll drives MotionValues, not React renders; geometry changes only
// on resize. The fixed frame scales uniformly so the photograph never stretches.
export function ImagePortalHero({ children }: { children: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [geometry, setGeometry] = useState({ width: 420, height: 263, scale: 4, y: 140 });
  const phaseRef = useRef<"opening" | "zooming" | "entered">("opening");
  const [phase, setPhase] = useState<"opening" | "zooming" | "entered">("opening");
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const trackX = useMotionValue(0);
  const selectedX = useMotionValue(0);
  const portalX = useTransform(() => selectedX.get() * (1 - ramp(scrollYProgress.get(), 0, .14)));
  const portalOpacity = useTransform(scrollYProgress, (p) => ramp(p, 0, .015));
  const scale = useTransform(scrollYProgress, (p) => 1 + ramp(p, .14, .73) * (geometry.scale - 1) + ramp(p, .73, 1) * geometry.scale * .08);
  const y = useTransform(scrollYProgress, (p) => geometry.y * (1 - ramp(p, .14, .73)));
  const radius = useTransform(scrollYProgress, (p) => 16 * (1 - ramp(p, 0, .73)));
  const copyOpacity = useTransform(scrollYProgress, (p) => 1 - ramp(p, .1, .3));
  const copyY = useTransform(scrollYProgress, (p) => -85 * ramp(p, 0, .3));
  const sideOpacity = useTransform(scrollYProgress, (p) => 1 - ramp(p, .015, .12));
  const scrim = useTransform(scrollYProgress, (p) => .05 * ramp(p, 0, .55) + .75 * ramp(p, .55, .83));
  const revealOpacity = useTransform(scrollYProgress, (p) => ramp(p, .72, .88));
  const revealY = useTransform(scrollYProgress, (p) => 30 * (1 - ramp(p, .72, .9)));

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const next = progress > 0.82 ? "entered" : progress > 0.24 ? "zooming" : "opening";
    if (phaseRef.current !== next) {
      phaseRef.current = next;
      setPhase(next);
    }
  });

  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    let previous = 0;
    let distance = ((trackX.get() % ((geometry.width + 22) * 3)) + ((geometry.width + 22) * 3)) % ((geometry.width + 22) * 3);
    const cycle = (geometry.width + 22) * 3;
    const tick = (time: number) => {
      if (previous && scrollYProgress.get() <= .001 && !paused && !document.hidden) {
        distance = (distance + Math.min(time - previous, 50) * .025) % cycle;
      }
      previous = time;
      const offset = distance - cycle * 2;
      trackX.set(offset);
      if (scrollYProgress.get() <= .001) selectedX.set(distance - Math.round(distance / cycle) * cycle);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [geometry.width, paused, reducedMotion, scrollYProgress, selectedX, trackX]);

  useLayoutEffect(() => {
    const measure = () => {
      if (!stage.current || !copy.current) return;
      const w = stage.current.clientWidth;
      const h = stage.current.clientHeight;
      const width = w < 600 ? 220 : 300;
      const height = width * .775;
      // Keep the opening image below the actual copy (including an opened form).
      const top = Math.max(copy.current.offsetTop + copy.current.offsetHeight + 36, h * 0.57);
      setGeometry({ width, height, scale: Math.max(w / width, h / height) * 1.025, y: top + height / 2 - h / 2 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (stage.current) observer.observe(stage.current);
    if (copy.current) observer.observe(copy.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={section} className="el-portal" data-motion={reducedMotion ? "reduced" : "full"} data-phase={phase} id="top" aria-label="Early, proof of discovery">
      <div ref={stage} className="el-portal-stage">
        <motion.div ref={copy} className="el-hero-copy" style={reducedMotion ? undefined : { opacity: copyOpacity, y: copyY }} inert={!reducedMotion && phase !== "opening"}>
          <p className="el-tagline">A different kind of receipt.</p>
          <h1>You knew before<br />everyone else. <span>Prove it.</span></h1>
          <p className="el-hero-description">The artist. The idea. The next big thing.<br />Keep proof of the moments you discovered first.</p>
          {children}
          <a className="el-skip" href="#how">See how it works <ArrowDown size={14} /></a>
        {!reducedMotion && <button className="el-marquee-pause" type="button" onClick={() => setPaused(value => !value)} aria-pressed={paused}>{paused ? "Resume images" : "Pause images"}</button>}
        </motion.div>

        <motion.div className="el-marquee" aria-hidden="true" style={{ top: `calc(50% + ${geometry.y}px)`, opacity: reducedMotion ? 1 : sideOpacity }}>
          <motion.div className="el-marquee-track" style={{ left: `calc(50% - ${geometry.width / 2}px)`, x: reducedMotion ? 0 : trackX }}>
            {Array.from({ length: 5 }, (_, group) => ["/creator-day-one-backstage.jpg", "/creator-small-artist.jpg", "/creator-free-ticket.jpg"].map((src, index) => (
              <figure className="el-marquee-image" key={`${group}-${index}`} style={{ width: geometry.width, height: geometry.height }}>
                <Image src={src} alt="" fill sizes="300px" />
              </figure>
            )))}
          </motion.div>
        </motion.div>


        <motion.figure className="el-portal-image" data-testid="image-portal" style={reducedMotion ? undefined : { width: geometry.width, height: geometry.height, scale, y, x: portalX, opacity: portalOpacity, borderRadius: radius }}>
          <Image src="/creator-day-one-backstage.jpg" alt="A creator offers free backstage passes to day-one fans who keep this video as proof" fill sizes="100vw" priority className="el-portal-photo" />
        </motion.figure>
        {!reducedMotion && <motion.div className="el-portal-scrim" style={{ opacity: scrim }} aria-hidden="true" />}
        <motion.div className="el-portal-reveal" style={reducedMotion ? undefined : { opacity: revealOpacity, y: revealY }} inert={!reducedMotion && phase !== "entered"} aria-hidden={!reducedMotion && phase !== "entered"}>
          <span>Early / proof of discovery</span>
          <h2>A moment becomes<br />something you can keep.</h2>
          <p>Prove the interaction. Preserve the moment.<br />Choose what the world gets to see.</p>
          <Link href="#how">How it works <ArrowUpRight size={19} /></Link>
        </motion.div>
        <motion.div className="el-portal-caption" style={reducedMotion ? undefined : { opacity: copyOpacity }} aria-hidden="true"><span>Follow your curiosity.</span><span>Scroll into the moment ↓</span></motion.div>
      </div>
    </section>
  );
}
