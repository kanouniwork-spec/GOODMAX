"use client";

import { useEffect, useRef, useState } from "react";

type Media = { type: "image" | "video"; url: string; alt: string };
export type ZoomLabels = { zoomIn: string; zoomOut: string; zoomInTouch: string; zoomOutTouch: string };

const ZOOM = 2.5;
const DOUBLE_TAP_MS = 320;
const pct = (v: number) => Math.min(100, Math.max(0, v));
/** Taps and clicks on the thumbnails or the zoom button are not zoom gestures. */
const onControl = (e: { target: EventTarget }) => !!(e.target as Element).closest?.("button");

/**
 * Product stage with restrained mouse parallax (rotateX/Y, small translate), a media switcher and
 * double-click / double-tap zoom on photos. While zoomed the mouse pans by moving and a finger by dragging.
 */
export function ProductStage({ media, thumbsLabel, zoomLabels }: { media: Media[]; thumbsLabel: string; zoomLabels: ZoomLabels }) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const float = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const down = useRef({ type: "mouse", id: -1, x: 0, y: 0, lastX: 0, lastY: 0 });
  const lastTap = useRef({ t: -1e9, x: 0, y: 0 });
  const origin = useRef({ x: 50, y: 50 });
  const current = media[active];
  const isImage = current?.type === "image";

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomed]);

  const resetParallax = () => {
    if (!float.current) return;
    float.current.style.transition = "";
    float.current.style.transform = "";
  };

  /** The photo's resting box: parallax is off while zoomed, so this is where it sits unzoomed. */
  const box = () => float.current?.getBoundingClientRect();
  const setOrigin = (x: number, y: number) => {
    origin.current = { x: pct(x), y: pct(y) };
    if (img.current) img.current.style.transformOrigin = `${origin.current.x}% ${origin.current.y}%`;
  };
  /** Zooms in on a screen point (the middle when none is given), or back out. */
  const toggle = (clientX?: number, clientY?: number) => {
    if (zoomed) return setZoomed(false);
    const r = box();
    if (!r) return;
    setOrigin(clientX === undefined ? 50 : ((clientX - r.left) / r.width) * 100, clientY === undefined ? 50 : ((clientY - r.top) / r.height) * 100);
    resetParallax();
    setZoomed(true);
  };

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomed) {
      const r = box();
      if (!r) return;
      if (e.pointerType === "mouse") {
        // the point under the cursor stays under it, so sweeping the photo shows all of it
        setOrigin(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
      } else if (e.pointerId === down.current.id) {
        // a finger drags the photo along with it
        const d = down.current;
        setOrigin(
          origin.current.x - ((e.clientX - d.lastX) / (r.width * (ZOOM - 1))) * 100,
          origin.current.y - ((e.clientY - d.lastY) / (r.height * (ZOOM - 1))) * 100,
        );
        d.lastX = e.clientX;
        d.lastY = e.clientY;
      }
      return;
    }
    if (e.pointerType !== "mouse" || !float.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    float.current.style.transition = "transform 120ms linear";
    float.current.style.transform = `translate3d(${x * 14}px, ${y * 10}px, 0) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  };
  const leave = (e: React.PointerEvent<HTMLDivElement>) => {
    resetParallax();
    // touch pointers also "leave" when the finger lifts, so only the mouse zooms back out here
    if (e.pointerType === "mouse") setZoomed(false);
  };

  const press = (e: React.PointerEvent<HTMLDivElement>) => {
    const id = onControl(e) ? -1 : e.pointerId;
    down.current = { type: e.pointerType, id, x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY };
  };
  /** Touch and pen: two quick taps in about the same place toggle the zoom. */
  const release = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || !isImage || onControl(e)) return;
    const d = down.current;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return; // a drag, not a tap
    const now = performance.now();
    const prev = lastTap.current;
    if (now - prev.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 40) {
      lastTap.current = { t: -1e9, x: 0, y: 0 };
      toggle(e.clientX, e.clientY);
    } else {
      lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
  };
  const doubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // some phones also send dblclick after two taps; those were already handled in release()
    if (down.current.type !== "mouse" || !isImage || onControl(e)) return;
    toggle(e.clientX, e.clientY);
  };

  const pick = (i: number) => {
    setActive(i);
    setZoomed(false);
  };

  return (
    <div
      className={`product-card__stage${isImage ? " has-zoom" : ""}${zoomed ? " is-zoomed" : ""}`}
      onPointerMove={move}
      onPointerLeave={leave}
      onPointerDown={press}
      onPointerUp={release}
      onDoubleClick={doubleClick}
    >
      {current?.type === "video" ? (
        <video key={current.url} className="product-card__video" src={current.url} muted playsInline autoPlay loop aria-label={current.alt} />
      ) : current ? (
        <div className="product-float" ref={float}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={img} src={current.url} alt={current.alt} loading="lazy" decoding="async" draggable={false} />
          <div className="product-float__shadow" />
        </div>
      ) : null}
      {isImage && (
        <button type="button" className="product-zoom" onClick={() => toggle()}>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4M8 11h6" />
            {!zoomed && <path d="M11 8v6" />}
          </svg>
          <span className="product-zoom__mouse">{zoomed ? zoomLabels.zoomOut : zoomLabels.zoomIn}</span>
          <span className="product-zoom__touch">{zoomed ? zoomLabels.zoomOutTouch : zoomLabels.zoomInTouch}</span>
        </button>
      )}
      {media.length > 1 && (
        <div className="product-card__thumbs" role="group" aria-label={thumbsLabel}>
          {media.map((m, i) => (
            <button key={m.url + i} type="button" aria-pressed={i === active} aria-label={m.alt} onClick={() => pick(i)}>
              {m.type === "video" ? (
                <video src={m.url} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
