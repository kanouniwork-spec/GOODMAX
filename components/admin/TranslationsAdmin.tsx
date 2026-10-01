"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale, SiteSettingsMap } from "@/types/content";
import { LOCALES } from "@/types/content";
import type { Dictionary, UiKey } from "@/lib/i18n/dictionaries";
import { saveSetting } from "@/app/admin/actions";
import { useAct, useAdmin } from "./ui";

export function TranslationsAdmin({
  keys,
  defaults,
  overrides,
  missing,
}: {
  keys: UiKey[];
  defaults: Record<Locale, Dictionary>;
  overrides: SiteSettingsMap["ui_strings"];
  missing: { where: string; field: string; locales: string[]; href: string }[];
}) {
  const [tab, setTab] = useState<"content" | "ui">("content");
  const [vals, setVals] = useState(overrides);
  const [q, setQ] = useState("");
  const [dirty, setDirty] = useState(false);
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const set = (l: Locale, k: string, v: string) => {
    setVals({ ...vals, [l]: { ...(vals[l] ?? {}), [k]: v } });
    setDirty(true);
  };
  const shown = keys.filter((k) => !q || k.includes(q) || LOCALES.some((l) => (vals[l]?.[k] ?? defaults[l][k]).toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Translations</h1>
          <p>Missing content translations across pages, brands and products, and every interface string in English, French and Arabic.</p>
        </div>
        {tab === "ui" && !readOnly && (
          <button type="button" className="a-btn a-btn--primary" disabled={!dirty || pending} onClick={() => run(() => saveSetting("ui_strings", vals), "Interface strings saved", () => setDirty(false))}>
            Save interface strings
          </button>
        )}
      </div>
      <div className="a-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "content"} onClick={() => setTab("content")}>
          Missing in content ({missing.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "ui"} onClick={() => setTab("ui")}>
          Interface strings ({keys.length})
        </button>
      </div>
      {tab === "content" ? (
        missing.length === 0 ? (
          <p className="a-card">Every filled field has all three languages.</p>
        ) : (
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Where</th>
                  <th>Field</th>
                  <th>Missing</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {missing.map((m, i) => (
                  <tr key={i}>
                    <td>{m.where}</td>
                    <td>{m.field}</td>
                    <td>
                      {m.locales.map((l) => (
                        <span key={l} className="badge badge--danger" style={{ marginRight: 4 }}>
                          {l.toUpperCase()}
                        </span>
                      ))}
                    </td>
                    <td>
                      <Link className="a-btn a-btn--sm" href={m.href}>
                        Fix
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <div className="a-toolbar">
            <div className="a-field" style={{ flex: 1 }}>
              <label htmlFor="tq">Search</label>
              <input id="tq" type="text" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Key</th>
                  {LOCALES.map((l) => (
                    <th key={l}>{l.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((k) => (
                  <tr key={k}>
                    <td className="mono">{k}</td>
                    {LOCALES.map((l) => (
                      <td key={l}>
                        <input
                          className="a-input"
                          dir={l === "ar" ? "rtl" : "ltr"}
                          readOnly={readOnly}
                          placeholder={defaults[l][k]}
                          value={vals[l]?.[k] ?? ""}
                          onChange={(e) => set(l, k, e.target.value)}
                          aria-label={`${k} ${l}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Empty fields use the built-in text shown in grey.
          </p>
        </>
      )}
    </>
  );
}
