"use client";

import { useEffect, useState } from "react";
import type { PixelProvider } from "@/types/content";
import { pixelSnippet } from "@/lib/pixels";

const KEY = "gm_consent";

function inject(pixels: { provider: PixelProvider; id: string }[]) {
  for (const p of pixels) {
    const marker = `pixel-${p.provider}`;
    if (document.getElementById(marker)) continue;
    const { src, inline } = pixelSnippet(p.provider, p.id);
    if (src) {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      document.head.appendChild(s);
    }
    const s = document.createElement("script");
    s.id = marker;
    s.text = inline;
    document.head.appendChild(s);
  }
}

/** Marketing scripts load only after the visitor accepts. Nothing renders when no pixel is active. */
export function Consent({
  pixels,
  text,
  labels,
  requireConsent,
}: {
  pixels: { provider: PixelProvider; id: string }[];
  text: string;
  labels: { accept: string; decline: string };
  requireConsent: boolean;
}) {
  const [choice, setChoice] = useState<"accepted" | "declined" | null | "unknown">("unknown");

  useEffect(() => {
    let v: string | null = null;
    try {
      v = localStorage.getItem(KEY);
    } catch {}
    setChoice(v === "accepted" || v === "declined" ? v : null);
  }, []);

  useEffect(() => {
    if (!pixels.length) return;
    if (choice === "accepted" || (!requireConsent && choice !== "unknown")) inject(pixels);
  }, [choice, pixels, requireConsent]);

  if (!pixels.length || !requireConsent || choice !== null) return null;
  const decide = (v: "accepted" | "declined") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    setChoice(v);
  };
  return (
    <div className="consent" role="dialog" aria-live="polite" aria-label="Cookies">
      <p>{text}</p>
      <div>
        <button type="button" className="btn btn--ghost" onClick={() => decide("declined")}>
          {labels.decline}
        </button>
        <button type="button" className="btn" onClick={() => decide("accepted")}>
          {labels.accept}
        </button>
      </div>
    </div>
  );
}
