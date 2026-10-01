"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types/content";

const ITEMS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pages", label: "Page Builder" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/requests", label: "Distributor Requests" },
  { href: "/admin/media", label: "Media Library" },
  { href: "/admin/socials", label: "Social Links" },
  { href: "/admin/locations", label: "Locations & Maps" },
  { href: "/admin/users", label: "Users & Roles", adminOnly: true },
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/appearance", label: "Appearance" },
  { href: "/admin/seo", label: "SEO" },
  { href: "/admin/pixels", label: "Marketing Pixels" },
  { href: "/admin/translations", label: "Translations" },
  { href: "/admin/publishing", label: "Publishing" },
];

export function AdminNav({ newRequests, role }: { newRequests: number; role: Role }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin">
      {ITEMS.filter((i) => !i.adminOnly || role === "admin").map((i) => {
        const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            {i.label}
            {i.href === "/admin/requests" && newRequests > 0 && <span className="count">{newRequests}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
