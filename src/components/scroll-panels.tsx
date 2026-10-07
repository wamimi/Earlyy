"use client";

import Image from "next/image";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

const ramp = (p: number, a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)));

function MusicPortal({ progress, enabled }: { progress: MotionValue<number>; enabled: boolean }) {
  const frame = useRef<HTMLElement>(null);
  const [geometry, setGeometry] = useState({ scale: 1, x: 0, y: 0 });
  const zoom = useTransform(progress, p => enabled ? ramp(p, .035, .13) * (1 - ramp(p, .19, .29)) : 0);
  const scale = useTransform(zoom, p => 1 + p * (geometry.scale - 1));
  const x = useTransform(zoom, p => p * geometry.x);
  const y = useTransform(zoom, p => p * geometry.y);
  const radius = useTransform(zoom, p => 16 * (1 - p));
  useLayoutEffect(() => {
    const measure = () => {
      if (!frame.current) return;
      // Offset geometry is independent of the current animated transform.
      const el = frame.current;
      const stage = el.closest('.el-scroll-stage') as HTMLElement;
      let left = 0, top = 0;
      let parent: HTMLElement | null = el;
      while (parent && parent !== stage) { left += parent.offsetLeft; top += parent.offsetTop; parent = parent.offsetParent as HTMLElement | null; }
      setGeometry({ scale: Math.max(stage.clientWidth / el.offsetWidth, stage.clientHeight / el.offsetHeight) * 1.03, x: stage.clientWidth / 2 - left - el.offsetWidth / 2, y: stage.clientHeight / 2 - top - el.offsetHeight / 2 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  return <motion.figure ref={frame} className="el-music-photo" data-testid="image-portal" style={{ scale, x, y, borderRadius: radius }}>
    <Image src="/creator-day-one-backstage.jpg" alt="A creator offers free backstage passes to day-one fans who keep this video as proof" fill sizes="(max-width: 760px) 90vw, 100vw" />
  </motion.figure>;
}

export function ScrollPanels({ id, title, panels, musicPortal = false }: { id: string; title?: string; panels: { name: string; content: ReactNode }[]; musicPortal?: boolean }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [distance, setDistance] = useState(0);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const start = musicPortal ? .31 : .06;
  const position = useTransform(scrollYProgress, p => ramp(p, start, .94));
  const x = useTransform(position, p => -p * distance);
  const zoom = useTransform(scrollYProgress, p => musicPortal ? ramp(p, .035, .13) * (1 - ramp(p, .19, .29)) : 0);
  const copyOpacity = useTransform(zoom, p => 1 - ramp(p, 0, .55));
  const animated = ready && !reduced && !mobile;
  useMotionValueEvent(position, 'change', p => setActive(previous => {
    if (!animated) return previous;
    const next = Math.round(p * (panels.length - 1));
    return next === previous ? previous : next;
  }));
  useLayoutEffect(() => {
    const measure = () => {
      setMobile(window.innerWidth <= 760);
      setReady(true);
      if (!track.current || !stage.current) return;
      const panel = track.current.firstElementChild as HTMLElement;
      setDistance((panel.offsetWidth + 40) * (panels.length - 1));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (track.current?.firstElementChild) observer.observe(track.current.firstElementChild);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [panels.length]);
  useEffect(() => {
    if (animated || !ready || !track.current) return;
    const items = Array.from(track.current.children);
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setActive(items.indexOf(entry.target));
    }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
    items.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, [animated, ready]);
  function jump(index: number) {
    if (!section.current) return;
    if (!animated) { document.getElementById(`${id}-${index}`)?.scrollIntoView({ behavior: 'auto', block: 'start' }); return; }
    const p = index === 0 ? 0 : start + index / (panels.length - 1) * (.94 - start);
    window.scrollTo({ top: section.current.offsetTop + p * (section.current.offsetHeight - window.innerHeight), behavior: 'auto' });
  }
  return <section ref={section} id={id} className={`el-scroll-section ${musicPortal ? 'el-culture' : 'el-process'}`} data-motion={animated ? 'full' : 'reduced'} data-active={active}>
    <div ref={stage} className="el-scroll-stage">
      <motion.div className="el-scroll-heading" style={animated ? { opacity: copyOpacity } : undefined}>
        {title && <h2>{title}</h2>}
        <nav aria-label={musicPortal ? 'Explore Early by audience' : 'How it works steps'}>{panels.map((panel, i) => <button type="button" key={panel.name} aria-current={active === i ? 'step' : undefined} onClick={() => jump(i)}><span>{panel.name}</span></button>)}</nav>
      </motion.div>
      <motion.div ref={track} className="el-scroll-track" style={animated ? { x } : undefined}>
        {panels.map((panel, i) => <article key={panel.name} id={`${id}-${i}`} className={`el-scroll-panel ${musicPortal ? 'el-chapter' : 'el-step'}`} inert={animated && active !== i} aria-label={panel.name}>
          {musicPortal && i === 0 ? <>
            <motion.div className="el-chapter-copy" style={animated ? { opacity: copyOpacity } : undefined}><span>Music</span><h2>Your day-one support.<br />Your backstage moment.</h2><p>Artists can find the fans who believed first and recognize them with tickets, access, and rewards.</p></motion.div>
            <div className="el-chapter-visual el-music-visual"><MusicPortal progress={scrollYProgress} enabled={animated} /><span className="el-chapter-caption">An artist’s promise to their day-one fans.</span></div>
          </> : panel.content}
        </article>)}
      </motion.div>
      <motion.p className="el-scroll-cue" style={animated ? { opacity: copyOpacity } : undefined}>{active + 1} / {panels.length}<span>Scroll to explore →</span></motion.p>
    </div>
  </section>;
}
