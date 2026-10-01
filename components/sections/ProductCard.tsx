"use client";

import { useRef, useState } from "react";

type Media = { type: "image" | "video"; url: string; alt: string };

/** Product stage with restrained mouse parallax (rotateX/Y, small translate) and a media switcher. */
export function ProductStage({ media, thumbsLabel }: { media: Media[]; thumbsLabel: string }) {
  const [active, setActive] = useState(0);
  const float = useRef<HTMLDivElement>(null);
  const current = media[active];

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !float.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    float.current.style.transition = "transform 120ms linear";
    float.current.style.transform = `translate3d(${x * 14}px, ${y * 10}px, 0) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  };
  const leave = () => {
    if (!float.current) return;
    float.current.style.transition = "";
    float.current.style.transform = "";
  };

  return (
    <div className="product-card__stage" onPointerMove={move} onPointerLeave={leave}>
      {current?.type === "video" ? (
        <video key={current.url} className="product-card__video" src={current.url} muted playsInline autoPlay loop aria-label={current.alt} />
      ) : current ? (
        <div className="product-float" ref={float}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt={current.alt} loading="lazy" decoding="async" />
          <div className="product-float__shadow" />
        </div>
      ) : null}
      {media.length > 1 && (
        <div className="product-card__thumbs" role="group" aria-label={thumbsLabel}>
          {media.map((m, i) => (
            <button key={m.url + i} type="button" aria-pressed={i === active} aria-label={m.alt} onClick={() => setActive(i)}>
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
