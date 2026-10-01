"use client";

import { useState } from "react";
import type { SocialLink, SocialPlatform } from "@/types/content";
import { SOCIAL_PLATFORMS } from "@/types/content";
import { deleteRecord, reorderRecords, saveRecord, setVisible } from "@/app/admin/actions";
import { PLATFORM_NAMES, SocialIcon } from "@/components/site/SocialIcon";
import { Confirm, SortableList, Switch, useAct, useAdmin } from "./ui";

export function SocialsEditor({ links }: { links: SocialLink[] }) {
  const { run } = useAct();
  const { readOnly } = useAdmin();
  const [edits, setEdits] = useState<Record<string, Partial<SocialLink>>>({});
  const byId = Object.fromEntries(links.map((l) => [l.id, { ...l, ...edits[l.id] }]));
  const set = (id: string, p: Partial<SocialLink>) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...p } }));
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Social Links</h1>
          <p>Shown in the footer and on the Contact page. A platform can only be visible once it has a URL.</p>
        </div>
        {!readOnly && (
          <button type="button" className="a-btn a-btn--primary" onClick={() => run(() => saveRecord("social_links", null, { platform: "instagram", label: "", url: "", visible: false }), "Platform added")}>
            + Add platform
          </button>
        )}
      </div>
      <SortableList
        ids={links.map((l) => l.id)}
        disabled={readOnly}
        onReorder={(ids) => run(() => reorderRecords("social_links", ids), "Order saved")}
        render={(id, handle) => {
          const l = byId[id];
          return (
            <div className="a-rowitem">
              {handle}
              <span style={{ width: 20, height: 20 }}>
                <SocialIcon platform={l.platform} />
              </span>
              <select className="a-input" style={{ width: 140 }} disabled={readOnly} value={l.platform} onChange={(e) => set(id, { platform: e.target.value as SocialPlatform })} aria-label="Platform">
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_NAMES[p]}
                  </option>
                ))}
              </select>
              <input className="a-input" style={{ flex: 2 }} placeholder="https://…" readOnly={readOnly} value={l.url} onChange={(e) => set(id, { url: e.target.value })} aria-label="URL" />
              <input className="a-input" style={{ flex: 1 }} placeholder="Label (optional)" readOnly={readOnly} value={l.label} onChange={(e) => set(id, { label: e.target.value })} aria-label="Label" />
              <Switch checked={l.visible} disabled={readOnly} label={l.visible ? "Visible" : "Hidden"} onChange={(v) => run(() => setVisible("social_links", id, v))} />
              {!readOnly && (
                <>
                  <button
                    type="button"
                    className="a-btn a-btn--sm a-btn--primary"
                    disabled={!edits[id]}
                    onClick={() =>
                      run(() => saveRecord("social_links", id, { platform: l.platform, url: l.url.trim(), label: l.label, visible: l.visible }), "Saved", () =>
                        setEdits((e) => {
                          const n = { ...e };
                          delete n[id];
                          return n;
                        }),
                      )
                    }
                  >
                    Save
                  </button>
                  <Confirm message="Remove this platform?" onConfirm={() => run(() => deleteRecord("social_links", id), "Removed")}>
                    Delete
                  </Confirm>
                </>
              )}
            </div>
          );
        }}
      />
    </>
  );
}
