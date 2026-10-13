"use client";

import { useEffect, useRef } from "react";

/**
 * The brand filter row. On phones it is one swipeable row, so the selected chip is scrolled to the
 * middle of the row (not the page) when it would otherwise sit off-screen.
 */
export function ChipBar({ label, children }: { label: string; children: React.ReactNode }) {
  const bar = useRef<HTMLElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = bar.current;
    const chip = el?.querySelector<HTMLElement>('[aria-current="true"]');
    const smooth = !first.current;
    first.current = false;
    if (!el || !chip || el.scrollWidth <= el.clientWidth) return;
    const r = chip.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    el.scrollBy({ left: r.left + r.width / 2 - (b.left + b.width / 2), behavior: smooth ? "smooth" : "auto" });
  });

  return (
    <nav ref={bar} className="filter-bar" aria-label={label}>
      {children}
    </nav>
  );
}
