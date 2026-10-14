"use client";

import { useEffect } from "react";

/**
 * Adds `.is-in` to `.reveal` elements as they enter the viewport, including elements that arrive
 * later without a page load (another page, or the product list after picking a brand).
 */
export function RevealObserver() {
  useEffect(() => {
    const show = (el: Element) => el.classList.add("is-in");
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              for (const e of entries) {
                if (e.isIntersecting) {
                  show(e.target);
                  io?.unobserve(e.target);
                }
              }
            },
            { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
          )
        : null;
    const watch = (el: Element) => (io ? io.observe(el) : show(el));
    const scan = (root: ParentNode) => root.querySelectorAll(".reveal:not(.is-in)").forEach(watch);
    scan(document);
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches(".reveal:not(.is-in)")) watch(n);
          scan(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io?.disconnect();
    };
  }, []);
  return null;
}
