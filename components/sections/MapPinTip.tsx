"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type PinEntry = { id: string; name: string; type: string; wilaya: string; place: string; phone: string; href: string };

type Open = { spot: number; x: number; top: number; bottom: number; pinned: boolean };

/**
 * Wraps the network map and opens a small card over a pin: the distributor's name and details, or a list when
 * several share the spot. Mouse: the card follows hover and stays while the cursor moves into it; clicking a
 * single pin opens its Google Maps link. Touch and keyboard: a tap or Enter opens the card, whose links lead on.
 * Pins in the map carry data-spot (their index in `spots`).
 */
export function MapPinTip({ spots, openLabel, children }: { spots: PinEntry[][]; openLabel: string; children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastPointer = useRef("mouse");
  const focusCard = useRef(false);
  const quietFocus = useRef(false); // focus handed back to a pin by Escape should not reopen its card
  const [open, setOpen] = useState<Open | null>(null);
  const [place, setPlace] = useState({ shift: 0, below: false });

  const cancelHide = () => clearTimeout(hideTimer.current);
  const hideSoon = () => {
    cancelHide();
    hideTimer.current = setTimeout(() => setOpen((o) => (o?.pinned ? o : null)), 180);
  };
  const pinOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<SVGElement>("[data-spot]") : null);
  const show = (pin: SVGElement, pinned: boolean) => {
    cancelHide();
    const box = wrap.current?.getBoundingClientRect();
    const head = pin.querySelector(".pin__mark")?.getBoundingClientRect();
    const spot = Number(pin.dataset.spot);
    if (!box || !head || !spots[spot]) return;
    setOpen((o) =>
      o && o.spot === spot && (o.pinned || !pinned)
        ? o
        : { spot, pinned, x: head.left + head.width / 2 - box.left, top: head.top - box.top, bottom: head.bottom - box.top },
    );
  };

  // keep the card inside the map: shift it sideways, and open it below the pin when there is no room above
  useLayoutEffect(() => {
    const el = card.current;
    if (!open || !el) return;
    const width = wrap.current?.clientWidth ?? 0;
    const half = el.offsetWidth / 2;
    const shift = Math.min(Math.max(open.x, half + 4), Math.max(half + 4, width - half - 4)) - open.x;
    setPlace({ shift, below: open.top - el.offsetHeight - 14 < -40 });
    if (focusCard.current) {
      focusCard.current = false;
      el.querySelector<HTMLElement>("a")?.focus();
    }
  }, [open]);

  // a card opened by a tap or Enter closes on a tap elsewhere and when the window is resized
  useEffect(() => {
    if (!open?.pinned) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(null);
    const close = () => setOpen(null);
    document.addEventListener("pointerdown", away);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("resize", close);
    };
  }, [open?.pinned]);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const entries = open ? spots[open.spot] : [];
  const wilayas = [...new Set(entries.map((e) => e.wilaya).filter(Boolean))].join(", ");

  return (
    <div
      ref={wrap}
      className="network-map__wrap"
      onPointerDown={(e) => (lastPointer.current = e.pointerType)}
      onPointerOver={(e) => {
        if (e.pointerType === "touch") return;
        const pin = pinOf(e.target);
        if (pin) show(pin, false);
        else if (card.current?.contains(e.target as Node)) cancelHide();
        else hideSoon();
      }}
      onPointerLeave={(e) => e.pointerType !== "touch" && hideSoon()}
      onClick={(e) => {
        const pin = pinOf(e.target);
        if (!pin) {
          if (!card.current?.contains(e.target as Node)) setOpen(null);
          return;
        }
        // a mouse click on a single linked pin simply follows the link; anything else opens the card
        if (pin.tagName.toLowerCase() === "a" && lastPointer.current !== "touch") return;
        e.preventDefault();
        show(pin, true);
      }}
      onKeyDown={(e) => {
        const pin = pinOf(e.target);
        if (e.key === "Escape" && open) {
          const back = wrap.current?.querySelector<SVGElement>(`[data-spot="${open.spot}"]`);
          setOpen(null);
          quietFocus.current = true;
          back?.focus();
          quietFocus.current = false;
        } else if (pin && pin.getAttribute("role") === "button" && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          focusCard.current = true;
          show(pin, true);
        }
      }}
      onFocus={(e) => {
        const pin = pinOf(e.target);
        if (pin && !quietFocus.current) show(pin, false);
      }}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node) && setOpen(null)}
    >
      {children}
      {open && entries.length > 0 && (
        <div
          ref={card}
          className={`pin-card${place.below ? " pin-card--below" : ""}`}
          style={{
            left: open.x,
            top: place.below ? open.bottom + 12 : open.top - 12,
            transform: `translate(calc(-50% + ${place.shift}px), ${place.below ? "0" : "-100%"})`,
            ["--arrow" as string]: `${-place.shift}px`,
          }}
          onPointerEnter={cancelHide}
        >
          {entries.length > 1 && (
            <span className="pin-card__head">
              {wilayas} · {entries.length}
            </span>
          )}
          <ul>
            {entries.map((p) => (
              <li key={p.id}>
                <b>{p.name}</b>
                <small>{[p.type, p.place || (entries.length > 1 ? "" : p.wilaya)].filter(Boolean).join(" · ")}</small>
                {p.phone && (
                  <a className="pin-card__phone" href={`tel:${p.phone.replace(/\s+/g, "")}`} dir="ltr">
                    {p.phone}
                  </a>
                )}
                {p.href && (
                  <a className="pin-card__map" href={p.href} target="_blank" rel="noopener noreferrer">
                    {openLabel} <span aria-hidden="true">↗</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
