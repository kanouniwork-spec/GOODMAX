"use client";

import { useState } from "react";
import type { MarketingPixel } from "@/types/content";
import { PIXEL_INFO, validPixelId } from "@/lib/pixels";
import { saveRecord } from "@/app/admin/actions";
import { Switch, useAct, useAdmin } from "./ui";

export function PixelsAdmin({ pixels }: { pixels: MarketingPixel[] }) {
  const [vals, setVals] = useState(Object.fromEntries(pixels.map((p) => [p.id, p])));
  const { run, pending } = useAct();
  const { readOnly } = useAdmin();
  const set = (id: string, patch: Partial<MarketingPixel>) => setVals({ ...vals, [id]: { ...vals[id], ...patch } });
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Marketing Pixels</h1>
          <p>
            Scripts load only when a pixel is enabled with a valid ID, and only after the visitor accepts the cookie banner (Site Settings › Cookie
            consent). &quot;Production only&quot; keeps them off preview deployments.
          </p>
        </div>
      </div>
      <div className="a-list">
        {pixels.map((p) => {
          const v = vals[p.id];
          const info = PIXEL_INFO[v.provider];
          const valid = !v.pixel_id || validPixelId(v.provider, v.pixel_id);
          return (
            <div key={p.id} className="a-rowitem" style={{ flexWrap: "wrap" }}>
              <div style={{ width: 180 }}>
                <b>{info.name}</b>
              </div>
              <div className="a-field" style={{ flex: 1, margin: 0, minWidth: 220 }}>
                <input
                  type="text"
                  aria-label={`${info.name} ID`}
                  placeholder={info.example}
                  readOnly={readOnly}
                  value={v.pixel_id}
                  onChange={(e) => set(p.id, { pixel_id: e.target.value.trim() })}
                  aria-invalid={!valid}
                />
                {!valid && <small style={{ color: "var(--a-danger)" }}>Format looks wrong — expected like {info.example}</small>}
              </div>
              <Switch checked={v.enabled} disabled={readOnly} label="Enabled" onChange={(x) => set(p.id, { enabled: x })} />
              <Switch checked={v.production_only} disabled={readOnly} label="Production only" onChange={(x) => set(p.id, { production_only: x })} />
              {!readOnly && (
                <button type="button" className="a-btn a-btn--primary a-btn--sm" disabled={pending} onClick={() => run(() => saveRecord("marketing_pixels", p.id, v as never), `${info.name} saved`)}>
                  Save
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
