"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

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
  const images = [
    { src: "/creator-day-one-backstage.jpg", alt: "A creator offers free backstage passes to day-one fans who keep this video as proof" },
    { src: "/creator-free-ticket.jpg", alt: "An artist invites early supporters to keep a post as their future ticket" },
    { src: "/creator-small-artist.jpg", alt: "A fan finds an artist before their audience grows" },
  ];
  const [selected, setSelected] = useState(0);
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
          <p className="el-tagline">For the people who believed first.</p>
          <h1>You helped it grow.<br /><span>You should be part of it.</span></h1>
          <p className="el-hero-description">The first listen. The first reply. The first leap of faith.<br />Turn the support you gave into a place in what comes next.</p>
          {children}
          <a className="el-skip" href="#how">See how it works <ArrowDown size={14} /></a>
        </motion.div>
        <motion.div className="el-image-stack" aria-hidden="true" style={{ width: geometry.width, height: geometry.height, y: geometry.y, opacity: reducedMotion ? 1 : sideOpacity }}>
          {[2, 1].map((depth) => <figure key={depth} style={{ transform: `translate(${depth * 9}px, ${-depth * 9}px) rotate(${depth === 1 ? -5 : 6}deg)` }}><Image src={images[(selected + depth) % images.length].src} alt="" fill sizes="300px" /></figure>)}
        </motion.div>
        <motion.div className="el-stack-controls" style={reducedMotion ? undefined : { y: geometry.width < 300 ? geometry.y - geometry.height / 2 - 33 : geometry.y + geometry.height / 2 + 27, opacity: copyOpacity }} inert={!reducedMotion && phase !== "opening"}>
          <button type="button" aria-label="Previous image" onClick={() => setSelected((selected + images.length - 1) % images.length)}>←</button>
          <span>{selected + 1} / {images.length}</span>
          <button type="button" aria-label="Next image" onClick={() => setSelected((selected + 1) % images.length)}>→</button>
        </motion.div>
        <motion.figure className="el-portal-image" data-testid="image-portal" style={reducedMotion ? undefined : { width: geometry.width, height: geometry.height, scale, y, borderRadius: radius }}>
          <Image src={images[selected].src} alt={images[selected].alt} fill sizes="100vw" priority className="el-portal-photo" />
        </motion.figure>
        {!reducedMotion && <motion.div className="el-portal-scrim" style={{ opacity: scrim }} aria-hidden="true" />}
        <motion.div className="el-portal-reveal" style={reducedMotion ? undefined : { opacity: revealOpacity, y: revealY }} inert={!reducedMotion && phase !== "entered"} aria-hidden={!reducedMotion && phase !== "entered"}>
          <span>Early / a place in the story</span>
          <h2>You were part of the beginning.<br />Stay part of the story.</h2>
          <p>A record of your support.<br />A way for the people you believe in to give back.</p>
          <Link href="#how">How it works <ArrowUpRight size={19} /></Link>
        </motion.div>
        <motion.div className="el-portal-caption" style={reducedMotion ? undefined : { opacity: copyOpacity }} aria-hidden="true"><span>Follow your curiosity.</span><span>Scroll into the moment ↓</span></motion.div>
      </div>
    </section>
  );
}
