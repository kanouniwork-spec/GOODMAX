"use client";

import { useEffect, useRef } from "react";

/** Draws the timeline line as the block scrolls through the viewport. */
export function TimelineProgress() {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const line = el.current;
    const list = line?.parentElement;
    if (!line || !list) return;
    const vertical = () => window.matchMedia("(max-width: 860px)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = list.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      line.style.transform = vertical() ? `scaleY(${p})` : `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return <span ref={el} className="timeline__progress" aria-hidden="true" />;
}
