"use client";

import type { SiteSettingsMap } from "@/types/content";
import type { Field } from "@/lib/sections/schema";
import { LocalesControl, SettingEditor } from "./SettingsEditor";

const GENERAL: Field[] = [
  { key: "site_name", type: "text", label: "Site name" },
  { key: "tagline_json", type: "ltext", label: "Tagline (used as default meta description)" },
  { key: "general_email", type: "text", label: "General contact email" },
  { key: "distributor_email", type: "text", label: "Distributor contact email" },
  { key: "phone", type: "text", label: "Phone" },
  { key: "address_json", type: "ltextarea", label: "Company / factory address" },
  { key: "factory_maps_url", type: "url", label: "Google Maps link for the factory" },
  { key: "factory_latitude", type: "number", label: "Factory latitude (shows the map on Contact)" },
  { key: "factory_longitude", type: "number", label: "Factory longitude" },
  {
    key: "default_locale",
    type: "select",
    label: "Default language",
    options: [
      { value: "en", label: "English" },
      { value: "fr", label: "Français" },
      { value: "ar", label: "العربية" },
    ],
  },
  { key: "wilaya_target", type: "number", label: "Wilaya coverage target", min: 1, max: 100 },
  {
    key: "distributor_extra_fields",
    type: "items",
    label: "Extra fields on the distributor form",
    itemLabel: "Field",
    help: "Optional fields added through configuration, not code.",
    fields: [
      { key: "key", type: "text", label: "Key (letters and underscores)" },
      { key: "label_json", type: "ltext", label: "Label" },
      { key: "required", type: "boolean", label: "Required" },
    ],
  },
];

const FOOTER: Field[] = [
  { key: "statement_json", type: "ltextarea", label: "Footer statement" },
  { key: "copyright_json", type: "ltext", label: "Copyright line" },
  { key: "show_languages", type: "boolean", label: "Show language list" },
  {
    key: "legal_links",
    type: "items",
    label: "Legal links",
    itemLabel: "Link",
    fields: [
      { key: "label_json", type: "ltext", label: "Label" },
      { key: "url", type: "url", label: "URL" },
      { key: "visible", type: "boolean", label: "Visible" },
    ],
  },
];

const CONSENT: Field[] = [
  { key: "enabled", type: "boolean", label: "Ask for consent before loading marketing pixels" },
  { key: "text_json", type: "ltextarea", label: "Consent banner text" },
];

export function SettingsPage(p: { general: SiteSettingsMap["general"]; footer: SiteSettingsMap["footer"]; consent: SiteSettingsMap["consent"] }) {
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Site Settings</h1>
          <p>Company details stay empty until GOODMAX supplies them; empty fields are simply hidden on the site.</p>
        </div>
      </div>
      <SettingEditor settingKey="general" title="General & contact" fields={GENERAL} initial={p.general}>
        {(v, set) => <LocalesControl value={v} set={set} />}
      </SettingEditor>
      <SettingEditor settingKey="footer" title="Footer" fields={FOOTER} initial={p.footer} />
      <SettingEditor settingKey="consent" title="Cookie consent" fields={CONSENT} initial={p.consent} />
    </>
  );
}
