export const LOCALES = ["en", "fr", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export type LocalizedText = Partial<Record<Locale, string>>;

export type Role = "admin" | "editor" | "viewer";

/** Fields shared by everything that goes through draft → publish. */
export interface Publishable {
  /** Snapshot of the content fields as last published. null = never published. */
  published_snapshot: Record<string, unknown> | null;
  published_at: string | null;
  updated_at: string;
  updated_by: string | null;
  /** Seeded demo/placeholder content that the owner must replace. */
  is_placeholder?: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
  created_at: string;
  /** Only used by the file backend; Supabase Auth stores credentials itself. */
  password_hash?: string;
}

export interface Page {
  id: string;
  slug: PageSlug;
  title_json: LocalizedText;
  sort_order: number;
}

export const PAGE_SLUGS = ["home", "about", "brands", "products", "distributors", "locations", "contact"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export interface PageSection extends Publishable {
  id: string;
  page_slug: PageSlug;
  section_type: SectionType;
  content_json: Record<string, unknown>;
  visible: boolean;
  sort_order: number;
}

export const SECTION_TYPES = [
  "video_story",
  "hero",
  "brand_rail",
  "product_grid",
  "rich_text",
  "timeline",
  "image_text",
  "values",
  "network",
  "distributor_cta",
  "distributor_form",
  "locations_list",
  "contact_block",
  "gallery",
  "video",
  "footer_cta",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export interface Brand extends Publishable {
  id: string;
  slug: string;
  name_json: LocalizedText;
  description_json: LocalizedText;
  cta_json: LocalizedText;
  logo_url: string;
  accent_color: string;
  background_url: string;
  visible: boolean;
  sort_order: number;
}

export interface ProductFeature {
  id: string;
  label_json: LocalizedText;
  title_json: LocalizedText;
  body_json: LocalizedText;
  visible: boolean;
}

export interface ProductMedia {
  id: string;
  media_type: "image" | "video";
  url: string;
  alt_json: LocalizedText;
  is_primary: boolean;
}

export interface Product extends Publishable {
  id: string;
  brand_id: string | null;
  slug: string;
  name_json: LocalizedText;
  short_description_json: LocalizedText;
  description_json: LocalizedText;
  cta_json: LocalizedText;
  cta_url: string;
  features: ProductFeature[];
  media: ProductMedia[];
  seo_json: { title?: LocalizedText; description?: LocalizedText };
  visible: boolean;
  sort_order: number;
}

export const REQUEST_STATUSES = ["new", "contacted", "qualified", "approved", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface DistributorRequest {
  id: string;
  full_name: string;
  company: string;
  city: string;
  wilaya: string;
  municipality: string;
  email: string;
  phone: string;
  commercial_register: string;
  interested_brand: string;
  extra_json: Record<string, string>;
  status: RequestStatus;
  internal_notes: string;
  locale: Locale;
  source: string;
  utm_json: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "new" | "read" | "archived";
  internal_notes: string;
  locale: Locale;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name_json: LocalizedText;
  location_type: "office" | "factory" | "distributor" | "warehouse" | "retail" | "other";
  wilaya: string;
  municipality: string;
  address_json: LocalizedText;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  maps_url: string;
  hours_json: LocalizedText;
  visible: boolean;
  sort_order: number;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  visible: boolean;
  sort_order: number;
}
export const SOCIAL_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "linkedin",
  "youtube",
  "x",
  "snapchat",
  "whatsapp",
  "telegram",
  "website",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface MediaItem {
  id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  alt_json: LocalizedText;
  created_at: string;
  /** Owner-supplied files bundled with the site (cannot be deleted from Admin). */
  bundled?: boolean;
}

export interface SeoEntry {
  id: string;
  route: string;
  title_json: LocalizedText;
  description_json: LocalizedText;
  image_url: string;
  canonical_url: string;
  robots: string;
  in_sitemap: boolean;
}

export const PIXEL_PROVIDERS = ["meta", "tiktok", "snapchat", "ga4", "gtm"] as const;
export type PixelProvider = (typeof PIXEL_PROVIDERS)[number];

export interface MarketingPixel {
  id: string;
  provider: PixelProvider;
  pixel_id: string;
  enabled: boolean;
  production_only: boolean;
  configuration_json: Record<string, unknown>;
}

export interface Wilaya {
  id: string;
  code: number;
  name_json: LocalizedText;
  municipalities: string[];
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  created_at: string;
}

/** Everything stored, keyed by table/collection name. */
export interface Collections {
  profiles: Profile;
  pages: Page;
  page_sections: PageSection;
  brands: Brand;
  products: Product;
  distributor_requests: DistributorRequest;
  contact_messages: ContactMessage;
  locations: Location;
  social_links: SocialLink;
  media_library: MediaItem;
  seo_entries: SeoEntry;
  marketing_pixels: MarketingPixel;
  wilayas: Wilaya;
  audit_log: AuditEntry;
}
export type CollectionName = keyof Collections;

/* ---------- site_settings values ---------- */

export interface GeneralSettings {
  site_name: string;
  tagline_json: LocalizedText;
  general_email: string;
  distributor_email: string;
  phone: string;
  address_json: LocalizedText;
  factory_maps_url: string;
  factory_latitude: number | null;
  factory_longitude: number | null;
  default_locale: Locale;
  enabled_locales: Locale[];
  wilaya_target: number;
  /** Extra optional fields shown on the distributor form, configured in Admin. */
  distributor_extra_fields: { key: string; label_json: LocalizedText; required: boolean }[];
}

export interface AppearanceSettings {
  primary: string;
  navy: string;
  background: string;
  text: string;
  muted: string;
  border: string;
  card_radius: number;
  button_radius: number;
  section_spacing: number;
  header_transparent_over_video: boolean;
  logo_url: string;
  logo_light_url: string;
  favicon_url: string;
}

export interface FooterSettings {
  statement_json: LocalizedText;
  legal_links: { id: string; label_json: LocalizedText; url: string; visible: boolean }[];
  copyright_json: LocalizedText;
  show_languages: boolean;
}

export interface SiteSettingsMap {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  footer: FooterSettings;
  ui_strings: Partial<Record<Locale, Record<string, string>>>;
  consent: { enabled: boolean; text_json: LocalizedText };
}
export type SettingKey = keyof SiteSettingsMap;
