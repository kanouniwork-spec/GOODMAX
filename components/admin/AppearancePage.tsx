"use client";

import type { SiteSettingsMap } from "@/types/content";
import type { Field } from "@/lib/sections/schema";
import { ContrastReport, SettingEditor } from "./SettingsEditor";

const FIELDS: Field[] = [
  { key: "primary", type: "color", label: "Primary blue" },
  { key: "navy", type: "color", label: "Navy" },
  { key: "background", type: "color", label: "Background" },
  { key: "text", type: "color", label: "Text" },
  { key: "muted", type: "color", label: "Muted text" },
  { key: "border", type: "color", label: "Borders" },
  { key: "card_radius", type: "number", label: "Card radius (px)", min: 0, max: 48 },
  { key: "button_radius", type: "number", label: "Button radius (px, 999 = pill)", min: 0, max: 999 },
  { key: "section_spacing", type: "number", label: "Section spacing (px)", min: 48, max: 240 },
  { key: "header_transparent_over_video", type: "boolean", label: "Transparent header over the homepage video" },
  { key: "logo_url", type: "media", label: "Logo (for light backgrounds)" },
  { key: "logo_light_url", type: "media", label: "Logo (white, for the video and footer)" },
  { key: "favicon_url", type: "media", label: "Favicon (optional; default is the GOODMAX X mark)" },
];

export function AppearancePage({ initial }: { initial: SiteSettingsMap["appearance"] }) {
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Appearance</h1>
          <p>Applied site-wide through CSS variables.</p>
        </div>
      </div>
      <SettingEditor settingKey="appearance" title="Brand colours, shape and logos" fields={FIELDS} initial={initial}>
        {(v) => <ContrastReport a={v} />}
      </SettingEditor>
    </>
  );
}
