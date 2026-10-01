import type { LocalizedText, SectionType } from "@/types/content";

/**
 * Field definitions for every section type. The admin Page Builder renders its
 * editor forms from these, and the public site renders the same content, so a
 * new field only needs to be declared here and read in the section component.
 */
export type Field =
  | { key: string; type: "ltext" | "ltextarea"; label: string; help?: string }
  | { key: string; type: "text" | "url" | "media" | "color"; label: string; help?: string }
  | { key: string; type: "number"; label: string; min?: number; max?: number; help?: string }
  | { key: string; type: "boolean"; label: string; help?: string }
  | { key: string; type: "select"; label: string; options: { value: string; label: string }[]; help?: string }
  | { key: string; type: "items"; label: string; itemLabel: string; fields: Field[]; help?: string };

const eyebrow: Field = { key: "eyebrow", type: "ltext", label: "Eyebrow (small label)" };
const title: Field = { key: "title", type: "ltext", label: "Title" };
const body: Field = { key: "body", type: "ltextarea", label: "Body" };
const link = (prefix: string, name: string): Field[] => [
  { key: `${prefix}_label`, type: "ltext", label: `${name} label` },
  { key: `${prefix}_url`, type: "url", label: `${name} URL` },
];

export interface SectionDefinition {
  type: SectionType;
  name: string;
  description: string;
  fields: Field[];
  /** Only one per page (e.g. the scroll video story). */
  singleton?: boolean;
}

export const SECTION_DEFINITIONS: Record<SectionType, SectionDefinition> = {
  video_story: {
    type: "video_story",
    name: "Video Story",
    description: "Full-screen scroll-controlled product video with feature callouts.",
    singleton: true,
    fields: [
      { key: "video_url", type: "media", label: "Video (desktop, H.264 MP4)" },
      { key: "video_mobile_url", type: "media", label: "Video (mobile, smaller MP4)" },
      { key: "video_webm_url", type: "media", label: "Video (optional WebM)" },
      { key: "poster_url", type: "media", label: "Poster / first frame (desktop)" },
      { key: "poster_mobile_url", type: "media", label: "Poster / first frame (mobile)" },
      { key: "scroll_length_vh", type: "number", label: "Scroll length (vh)", min: 250, max: 900, help: "400–550 recommended" },
      { key: "intro_logo", type: "boolean", label: "Show logo intro over the first frame" },
      { key: "intro_caption", type: "ltext", label: "Intro caption" },
      { key: "scroll_hint", type: "ltext", label: "Scroll hint" },
      {
        key: "stages",
        type: "items",
        label: "Feature stages",
        itemLabel: "Stage",
        fields: [
          { key: "label", type: "ltext", label: "Technical label (e.g. BLADE SYSTEM)" },
          { key: "title", type: "ltext", label: "Headline" },
          { key: "points", type: "ltextarea", label: "Points (one per line)" },
          {
            key: "side",
            type: "select",
            label: "Callout side",
            options: [
              { value: "start", label: "Start side (left in EN/FR)" },
              { value: "end", label: "End side (right in EN/FR)" },
              { value: "bottom", label: "Bottom panel (for close-ups)" },
            ],
          },
          { key: "from", type: "number", label: "Show from (% of story)", min: 0, max: 100 },
          { key: "to", type: "number", label: "Hide at (% of story)", min: 0, max: 100 },
        ],
      },
    ],
  },
  hero: {
    type: "hero",
    name: "Hero",
    description: "Page opening with title, subtitle and optional image or video.",
    fields: [
      eyebrow,
      title,
      { key: "subtitle", type: "ltextarea", label: "Subtitle" },
      { key: "media_url", type: "media", label: "Image or video" },
      {
        key: "media_type",
        type: "select",
        label: "Media type",
        options: [
          { value: "none", label: "None" },
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
        ],
      },
    ],
  },
  brand_rail: {
    type: "brand_rail",
    name: "Brand Rail",
    description: "Brand selector cards, quiet at rest and lit on hover.",
    fields: [eyebrow, title, { key: "subtitle", type: "ltextarea", label: "Subtitle" }, { key: "limit", type: "number", label: "Max brands (0 = all)", min: 0, max: 24 }],
  },
  product_grid: {
    type: "product_grid",
    name: "Product Grid",
    description: "Large product cards with technical characteristics.",
    fields: [eyebrow, title, { key: "subtitle", type: "ltextarea", label: "Subtitle" }, { key: "limit", type: "number", label: "Max products (0 = all)", min: 0, max: 48 }],
  },
  rich_text: {
    type: "rich_text",
    name: "Rich Text (editorial)",
    description: "Two-column editorial block: eyebrow, large headline, paragraph, link.",
    fields: [eyebrow, title, body, ...link("link", "Link")],
  },
  timeline: {
    type: "timeline",
    name: "Timeline",
    description: "Animated company milestones.",
    fields: [
      eyebrow,
      title,
      {
        key: "items",
        type: "items",
        label: "Milestones",
        itemLabel: "Milestone",
        fields: [
          { key: "year", type: "ltext", label: "Year / label" },
          { key: "title", type: "ltext", label: "Title" },
          { key: "body", type: "ltextarea", label: "Body" },
          { key: "visible", type: "boolean", label: "Visible" },
        ],
      },
    ],
  },
  image_text: {
    type: "image_text",
    name: "Image + Text",
    description: "Image beside an editorial text block.",
    fields: [
      eyebrow,
      title,
      body,
      { key: "image_url", type: "media", label: "Image" },
      {
        key: "image_side",
        type: "select",
        label: "Image side",
        options: [
          { value: "start", label: "Start" },
          { value: "end", label: "End" },
        ],
      },
      ...link("link", "Link"),
    ],
  },
  values: {
    type: "values",
    name: "Mission / Vision / Values",
    description: "Three editorial blocks.",
    fields: [
      eyebrow,
      title,
      {
        key: "items",
        type: "items",
        label: "Blocks",
        itemLabel: "Block",
        fields: [
          { key: "label", type: "ltext", label: "Label" },
          { key: "title", type: "ltext", label: "Title" },
          { key: "body", type: "ltextarea", label: "Body" },
        ],
      },
    ],
  },
  network: {
    type: "network",
    name: "Network Section",
    description: "Algeria coverage visual with wilaya network.",
    fields: [
      eyebrow,
      title,
      body,
      { key: "stat_value", type: "text", label: "Highlight number (e.g. 69)" },
      { key: "stat_label", type: "ltext", label: "Highlight label" },
      ...link("cta_primary", "Primary button"),
      ...link("cta_secondary", "Secondary button"),
    ],
  },
  distributor_cta: {
    type: "distributor_cta",
    name: "Distributor CTA",
    description: "Large partnership call to action.",
    fields: [eyebrow, title, body, ...link("cta", "Button")],
  },
  distributor_form: {
    type: "distributor_form",
    name: "Distributor Form",
    description: "The distributor application form (saved to the database).",
    singleton: true,
    fields: [eyebrow, title, body, { key: "success_text", type: "ltextarea", label: "Success message" }],
  },
  locations_list: {
    type: "locations_list",
    name: "Locations List + Map",
    description: "Location cards with an interactive map.",
    fields: [eyebrow, title, body, { key: "empty_text", type: "ltextarea", label: "Text when no locations are published" }],
  },
  contact_block: {
    type: "contact_block",
    name: "Contact Block",
    description: "Contact details, social links, map and contact form.",
    fields: [
      eyebrow,
      title,
      body,
      { key: "show_form", type: "boolean", label: "Show contact form" },
      { key: "show_map", type: "boolean", label: "Show factory / company map" },
      { key: "show_socials", type: "boolean", label: "Show social links" },
    ],
  },
  gallery: {
    type: "gallery",
    name: "Gallery",
    description: "Grid of images.",
    fields: [
      eyebrow,
      title,
      {
        key: "items",
        type: "items",
        label: "Images",
        itemLabel: "Image",
        fields: [
          { key: "image_url", type: "media", label: "Image" },
          { key: "caption", type: "ltext", label: "Caption / alt text" },
        ],
      },
    ],
  },
  video: {
    type: "video",
    name: "Video",
    description: "Standard video player block.",
    fields: [eyebrow, title, { key: "video_url", type: "media", label: "Video" }, { key: "poster_url", type: "media", label: "Poster" }],
  },
  footer_cta: {
    type: "footer_cta",
    name: "Footer CTA",
    description: "Compact closing call to action.",
    fields: [title, ...link("cta", "Button")],
  },
};

/** Collect every localized string in a section's content, with a readable path. */
export function collectLocalized(
  fields: Field[],
  content: Record<string, unknown>,
  prefix = "",
): { path: string; value: LocalizedText }[] {
  const out: { path: string; value: LocalizedText }[] = [];
  for (const f of fields) {
    const v = content?.[f.key];
    if (f.type === "ltext" || f.type === "ltextarea") {
      out.push({ path: prefix + f.label, value: (v as LocalizedText) ?? {} });
    } else if (f.type === "items" && Array.isArray(v)) {
      v.forEach((item, i) =>
        out.push(...collectLocalized(f.fields, item as Record<string, unknown>, `${prefix}${f.itemLabel} ${i + 1} › `)),
      );
    }
  }
  return out;
}

export function emptyContent(fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type === "ltext" || f.type === "ltextarea") out[f.key] = {};
    else if (f.type === "items") out[f.key] = [];
    else if (f.type === "boolean") out[f.key] = true;
    else if (f.type === "number") out[f.key] = f.min ?? 0;
    else if (f.type === "select") out[f.key] = f.options[0]?.value ?? "";
    else out[f.key] = "";
  }
  return out;
}
