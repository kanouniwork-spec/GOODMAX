import type { Field } from "@/lib/sections/schema";

export const BRAND_FIELDS: Field[] = [
  { key: "name_json", type: "ltext", label: "Brand name" },
  { key: "slug", type: "text", label: "URL slug", help: "Used in /products?brand=slug" },
  { key: "description_json", type: "ltextarea", label: "Short description" },
  { key: "cta_json", type: "ltext", label: "Button label" },
  { key: "logo_url", type: "media", label: "Logo (optional, transparent PNG/SVG works best)" },
  { key: "background_url", type: "media", label: "Card background image (optional)" },
  { key: "accent_color", type: "color", label: "Accent colour (hover glow)" },
];

export const productFields = (brands: { value: string; label: string }[]): Field[] => [
  { key: "name_json", type: "ltext", label: "Product name" },
  { key: "slug", type: "text", label: "URL slug" },
  { key: "brand_id", type: "select", label: "Brand", options: [{ value: "", label: "— No brand —" }, ...brands] },
  { key: "short_description_json", type: "ltextarea", label: "Short description" },
  { key: "description_json", type: "ltextarea", label: "Long description (optional)" },
  {
    key: "features",
    type: "items",
    label: "Technical characteristics",
    itemLabel: "Characteristic",
    help: "Only characteristics supplied by GOODMAX — no invented specs.",
    fields: [
      { key: "label_json", type: "ltext", label: "Label (e.g. 01)" },
      { key: "title_json", type: "ltext", label: "Title" },
      { key: "body_json", type: "ltextarea", label: "Detail" },
      { key: "visible", type: "boolean", label: "Visible" },
    ],
  },
  {
    key: "media",
    type: "items",
    label: "Images & video",
    itemLabel: "Media",
    fields: [
      {
        key: "media_type",
        type: "select",
        label: "Type",
        options: [
          { value: "image", label: "Image" },
          { value: "video", label: "Video" },
        ],
      },
      { key: "url", type: "media", label: "File" },
      { key: "alt_json", type: "ltext", label: "Alt text" },
      { key: "is_primary", type: "boolean", label: "Primary image" },
    ],
  },
  { key: "cta_json", type: "ltext", label: "Button label" },
  { key: "cta_url", type: "url", label: "Button link", help: "e.g. /locations or /distributors" },
];

export const PRODUCT_SEO_FIELDS: Field[] = [
  { key: "title", type: "ltext", label: "SEO title" },
  { key: "description", type: "ltextarea", label: "SEO description" },
];

export const locationFields = (wilayas: { value: string; label: string }[]): Field[] => [
  { key: "name_json", type: "ltext", label: "Name" },
  {
    key: "location_type",
    type: "select",
    label: "Type",
    options: [
      { value: "distributor", label: "Distributor" },
      { value: "retail", label: "Point of sale" },
      { value: "office", label: "Office" },
      { value: "factory", label: "Factory" },
      { value: "warehouse", label: "Warehouse" },
      { value: "other", label: "Other" },
    ],
  },
  { key: "wilaya", type: "select", label: "Wilaya", options: [{ value: "", label: "— Select —" }, ...wilayas] },
  { key: "municipality", type: "text", label: "Municipality" },
  { key: "address_json", type: "ltextarea", label: "Address" },
  { key: "latitude", type: "number", label: "Latitude", min: -90, max: 90 },
  { key: "longitude", type: "number", label: "Longitude", min: -180, max: 180 },
  { key: "maps_url", type: "url", label: "Google Maps URL" },
  { key: "phone", type: "text", label: "Phone" },
  { key: "email", type: "text", label: "Email" },
  { key: "hours_json", type: "ltext", label: "Working hours" },
];
