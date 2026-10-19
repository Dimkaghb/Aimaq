"use client";

/* Scroll and reveal primitives for the Aimaq landing page.
   Only transform and opacity are animated. Scroll-linked values are motion values,
   so scrolling never triggers React renders. Reduced motion is honoured per primitive
   and globally through <MotionConfig reducedMotion="user"> in LandingPage. */

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValueEvent,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

export const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, margin: "-10% 0px" } as const;

const tags = { div: motion.div, article: motion.article, p: motion.p, span: motion.span, h2: motion.h2 } as const;
type Tag = keyof typeof tags;

/* Reduced-motion preference, read after mount so server and first client render agree. */
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReduce(onChange: () => void) {
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
function useStill() {
  return useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE_QUERY).matches, () => false);
}

/* ── Reveal on enter ─────────────────────────────────────────────── */

export function Reveal({ as = "div", delay = 0, y = 24, immediate = false, className, id, children }: {
  as?: Tag; delay?: number; y?: number; immediate?: boolean; className?: string; id?: string; children: ReactNode;
}) {
  const Tag = tags[as] as typeof motion.div;
  return <Tag
    id={id}
    className={className}
    variants={{ hidden: { opacity: 0, y }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE, delay } } }}
    initial="hidden"
    animate={immediate ? "visible" : undefined}
    whileInView={immediate ? undefined : "visible"}
    viewport={VIEWPORT}
  >{children}</Tag>;
}

export function Stagger({ className, step = 0.09, children }: { className?: string; step?: number; children: ReactNode }) {
  return <motion.div
    className={className}
    variants={{ hidden: {}, visible: { transition: { staggerChildren: step } } }}
    initial="hidden"
    whileInView="visible"
    viewport={VIEWPORT}
  >{children}</motion.div>;
}

export function StaggerItem({ as = "div", className, children }: { as?: Tag; className?: string; children: ReactNode }) {
  const Tag = tags[as] as typeof motion.div;
  return <Tag
    className={className}
    variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } } }}
  >{children}</Tag>;
}

/* Headline lines that slide up out of a mask. Place inside an h1/h2. */
export function RevealLines({ lines, immediate = false, delay = 0 }: { lines: ReactNode[]; immediate?: boolean; delay?: number }) {
  return <motion.span
    style={{ display: "block" }}
    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: delay } } }}
    initial="hidden"
    animate={immediate ? "visible" : undefined}
    whileInView={immediate ? undefined : "visible"}
    viewport={VIEWPORT}
  >
    {lines.map((line, i) => <span key={i} style={{ display: "block", overflow: "hidden", paddingBottom: ".14em", marginBottom: "-.14em" }}>
      <motion.span style={{ display: "block" }} variants={{ hidden: { y: "105%" }, visible: { y: 0, transition: { duration: 0.8, ease: EASE } } }}>{line}</motion.span>
    </span>)}
  </motion.span>;
}

/* ── Scroll-linked ───────────────────────────────────────────────── */

function Word({ text, index, total, progress, still }: { text: string; index: number; total: number; progress: MotionValue<number>; still: boolean }) {
  const start = (index / total) * 0.8;
  const opacity = useTransform(progress, [start, start + 0.2], [0.22, 1]);
  return <><motion.span style={still ? undefined : { opacity }}>{text}</motion.span>{" "}</>;
}

/* Words light up one by one as the block scrolls through the viewport. */
export function WordScrub({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const still = useStill();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.55"] });
  const counts = lines.map((line) => line.split(" ").length);
  const total = counts.reduce((a, b) => a + b, 0);
  return <span ref={ref} style={{ display: "block" }}>
    {lines.map((line, li) => {
      const offset = counts.slice(0, li).reduce((a, b) => a + b, 0);
      return <span key={li} style={{ display: "block" }}>
        {line.split(" ").map((word, wi) => <Word key={wi} text={word} index={offset + wi} total={total} progress={scrollYProgress} still={still} />)}
      </span>;
    })}
  </span>;
}

/* Counts up once in view, and tweens whenever `value` changes afterwards. */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const still = useStill();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  useEffect(() => {
    if (still) { mv.set(value); return; }
    if (!inView) return;
    const controls = animate(mv, value, { duration: 0.9, ease: EASE });
    return () => controls.stop();
  }, [inView, value, still, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
}

/* Drifts against the scroll direction. */
export function Parallax({ amount = 24, className, children }: { amount?: number; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useStill();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  return <motion.div ref={ref} className={className} style={still ? undefined : { y }}>{children}</motion.div>;
}

/* Hero image: slow drift and zoom-out while the page scrolls, corners open up. */
export function HeroArt({ className, children }: { className?: string; children: ReactNode }) {
  const still = useStill();
  const { scrollY } = useScroll();
  const radius = useTransform(scrollY, [0, 600], [10, 22]);
  const scale = useTransform(scrollY, [0, 800], [1.1, 1.06]);
  const y = useTransform(scrollY, [0, 800], ["-2%", "2%"]);
  return <motion.div className={className} style={still ? undefined : { borderRadius: radius }}>
    <motion.div style={{ position: "absolute", inset: 0, ...(still ? {} : { scale, y }) }}>{children}</motion.div>
  </motion.div>;
}

/* Hero copy eases out as the page moves on. */
export function FadeOnExit({ children }: { children: ReactNode }) {
  const still = useStill();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 420], [1, 0.15]);
  const y = useTransform(scrollY, [0, 420], [0, -28]);
  return <motion.div style={still ? undefined : { opacity, y }}>{children}</motion.div>;
}

export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return <motion.div className={className} style={{ scaleX, transformOrigin: "0% 50%" }} aria-hidden="true" />;
}

function StepItem({ index, count, progress, still, className, fillClassName, children }: {
  index: number; count: number; progress: MotionValue<number>; still: boolean; className?: string; fillClassName?: string; children: ReactNode;
}) {
  const from = index / count;
  const fill = useTransform(progress, [from, (index + 1) / count], [0, 1]);
  const opacity = useTransform(progress, [from - 0.02, from + 0.12], [0.4, 1]);
  return <motion.article className={className} style={still ? undefined : { opacity }}>
    <motion.i className={fillClassName} style={{ scaleX: still ? 1 : fill, transformOrigin: "0% 50%" }} aria-hidden="true" />
    {children}
  </motion.article>;
}

/* A row of steps whose top rule fills and whose text activates with scroll. */
export function ScrollSteps({ className, itemClassName, fillClassName, items }: {
  className?: string; itemClassName?: string; fillClassName?: string; items: ReactNode[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useStill();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.6"] });
  return <div ref={ref} className={className}>
    {items.map((content, i) => <StepItem key={i} index={i} count={items.length} progress={scrollYProgress} still={still} className={itemClassName} fillClassName={fillClassName}>{content}</StepItem>)}
  </div>;
}

/* Pinned stage: a circle of the artwork grows with scroll until it fills the viewport,
   then the content fades in on top. Place `art` as the circle's picture. */
export function CircleReveal({ labelledBy, classes, art, onCoverChange, children }: {
  labelledBy: string;
  /** Fires when the circle has grown enough to sit fully behind the page header. */
  onCoverChange?: (covered: boolean) => void;
  classes: { track: string; stage: string; art: string; shade: string; content: string };
  art: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const still = useStill();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const covered = useRef(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = v > 0.45;
    if (next === covered.current) return;
    covered.current = next;
    onCoverChange?.(next);
  });
  const grow = useTransform(scrollYProgress, [0, 0.75], [0, 1]);
  const clipPath = useTransform(grow, (t) => `circle(calc(max(150px, 22vmin) + ${(t * (1 - (1 - t) * 0.35)).toFixed(4)} * 82vmax) at 50% 50%)`);
  // Function transforms on purpose: range-based opacity can be attached to a native scroll
  // timeline, which mis-resolves its range for content inside a sticky stage.
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const imageScale = useTransform(grow, (t) => 1.3 - 0.3 * t);
  const opacity = useTransform(scrollYProgress, (v) => clamp01((v - 0.32) / 0.23));
  const y = useTransform(scrollYProgress, (v) => 28 * (1 - clamp01((v - 0.32) / 0.28)));
  const pointerEvents = useTransform(scrollYProgress, (v) => (v > 0.45 ? "auto" : "none"));
  return <section ref={ref} className={classes.track} aria-labelledby={labelledBy}>
    <div className={classes.stage}>
      <motion.div className={classes.art} style={still ? undefined : { clipPath }}>
        <motion.div style={{ position: "absolute", inset: 0, ...(still ? {} : { scale: imageScale }) }}>{art}</motion.div>
        <div className={classes.shade} />
      </motion.div>
      <motion.div className={classes.content} style={still ? undefined : { opacity, y, pointerEvents }}>{children}</motion.div>
    </div>
  </section>;
}
