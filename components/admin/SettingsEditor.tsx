"use client";

import { useState } from "react";
import type { Locale, SettingKey, SiteSettingsMap } from "@/types/content";
import { LOCALES } from "@/types/content";
import type { Field } from "@/lib/sections/schema";
import { saveSetting } from "@/app/admin/actions";
import { contrast } from "@/lib/appearance";
import { FieldsForm, useAct, useAdmin } from "./ui";

/** Generic editor for one site_settings key. */
export function SettingEditor<K extends SettingKey>({
  settingKey,
  title,
  intro,
  fields,
  initial,
  children,
}: {
  settingKey: K;
  title: string;
  intro?: string;
  fields: Field[];
  initial: SiteSettingsMap[K];
  children?: (v: SiteSettingsMap[K], set: (v: SiteSettingsMap[K]) => void) => React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const set = (v: SiteSettingsMap[K]) => {
    setValue(v);
    setDirty(true);
  };
  return (
    <div className="a-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {intro && <p className="muted">{intro}</p>}
        </div>
        {!readOnly && (
          <button type="button" className="a-btn a-btn--primary" disabled={pending || !dirty} onClick={() => run(() => saveSetting(settingKey, value), "Saved", () => setDirty(false))}>
            Save
          </button>
        )}
      </div>
      <FieldsForm fields={fields} value={value as unknown as Record<string, unknown>} onChange={(v) => set(v as unknown as SiteSettingsMap[K])} />
      {children?.(value, set)}
    </div>
  );
}

export function LocalesControl({ value, set }: { value: SiteSettingsMap["general"]; set: (v: SiteSettingsMap["general"]) => void }) {
  return (
    <div className="a-field">
      <span className="a-label">Enabled languages</span>
      <div style={{ display: "flex", gap: 14 }}>
        {LOCALES.map((l) => (
          <label key={l} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={value.enabled_locales.includes(l)}
              onChange={(e) =>
                set({ ...value, enabled_locales: e.target.checked ? [...value.enabled_locales, l] : value.enabled_locales.filter((x: Locale) => x !== l) })
              }
            />
            {l.toUpperCase()}
          </label>
        ))}
      </div>
    </div>
  );
}

export function ContrastReport({ a }: { a: SiteSettingsMap["appearance"] }) {
  const rows: [string, string, string, number][] = [
    ["Text on background", a.text, a.background, 4.5],
    ["Muted text on background", a.muted, a.background, 4.5],
    ["White on primary", "#ffffff", a.primary, 3],
    ["White on navy", "#ffffff", a.navy, 4.5],
  ];
  return (
    <div className="a-field">
      <span className="a-label">Readability check (WCAG)</span>
      <div style={{ display: "grid", gap: 6 }}>
        {rows.map(([n, f, b, min]) => {
          const c = contrast(f, b);
          return (
            <div key={n} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ background: b, color: f, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--a-border)", minWidth: 60, textAlign: "center" }}>Aa</span>
              <span style={{ flex: 1 }}>{n}</span>
              <span className={`badge ${c >= min ? "badge--ok" : "badge--danger"}`}>
                {c.toFixed(2)}:1 {c >= min ? "OK" : `needs ${min}:1`}
              </span>
            </div>
          );
        })}
      </div>
      <small>Saving is refused when a pair fails, so the site never becomes unreadable.</small>
    </div>
  );
}
