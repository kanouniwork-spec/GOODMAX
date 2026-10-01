import type { AppearanceSettings } from "@/types/content";

export function appearanceVars(a: AppearanceSettings): Record<string, string> {
  return {
    "--c-primary": a.primary,
    "--c-navy": a.navy,
    "--c-bg": a.background,
    "--c-text": a.text,
    "--c-muted": a.muted,
    "--c-border": a.border,
    "--r-card": `${a.card_radius}px`,
    "--r-button": `${a.button_radius}px`,
    "--section-space": `${a.section_spacing}px`,
  };
}

/* WCAG contrast, used by Admin › Appearance to refuse unreadable colour pairs. */
function lum(hex: string) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string) {
  const la = lum(a);
  const lb = lum(b);
  if (la == null || lb == null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
