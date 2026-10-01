import type { Role } from "@/types/content";

export type Permission =
  | "read"
  | "content.write" // pages, sections, brands, products, translations, SEO, locations, socials, publishing
  | "media.write"
  | "requests.write"
  | "settings.write" // site settings, appearance, marketing pixels
  | "users.manage";

const MATRIX: Record<Role, Permission[]> = {
  admin: ["read", "content.write", "media.write", "requests.write", "settings.write", "users.manage"],
  editor: ["read", "content.write", "media.write", "requests.write"],
  viewer: ["read"],
};

export const can = (role: Role | undefined, p: Permission) => !!role && MATRIX[role].includes(p);

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Full access, including users, site settings, appearance and marketing pixels.",
  editor: "Edits content, products, brands, translations, SEO, media and requests.",
  viewer: "Read-only access to the admin.",
};
