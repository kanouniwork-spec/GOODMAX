"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CollectionName,
  Collections,
  Locale,
  PageSection,
  Profile,
  Role,
  SectionType,
  SettingKey,
  SiteSettingsMap,
} from "@/types/content";
import { LOCALES, PAGE_SLUGS, SECTION_TYPES } from "@/types/content";
import { backend, db, mediaStorage, newId } from "@/lib/data";
import { authorize, signIn, signOut } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { draftOf, mergeForPublish, type PublishableCollection } from "@/lib/content/publish";
import { emptyContent, SECTION_DEFINITIONS } from "@/lib/sections/schema";
import { contrast, isHex } from "@/lib/appearance";
import { PIXEL_INFO, validPixelId } from "@/lib/pixels";
import { serviceClient } from "@/lib/data/supabase-store";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const ok = <T,>(data?: T): ActionResult<T> => ({ ok: true, data });
const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

/** Which collections Admin may edit generically, and the permission each requires. */
const EDITABLE: Partial<Record<CollectionName, Permission>> = {
  page_sections: "content.write",
  brands: "content.write",
  products: "content.write",
  locations: "content.write",
  social_links: "content.write",
  seo_entries: "content.write",
  wilayas: "content.write",
  distributor_requests: "requests.write",
  contact_messages: "requests.write",
  media_library: "media.write",
  marketing_pixels: "settings.write",
};

function permFor(c: CollectionName) {
  const p = EDITABLE[c];
  if (!p) throw new Error(`Collection ${c} cannot be edited here`);
  return p;
}

async function audit(actor: string, action: string, entity: string, entity_id: string) {
  try {
    await db().insert("audit_log", { id: newId("log"), actor, action, entity, entity_id, created_at: new Date().toISOString() });
  } catch {
    /* audit is best-effort */
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

/** Server-side validation of what each collection may contain. */
function sanitize<K extends CollectionName>(c: K, data: Record<string, unknown>): Partial<Collections[K]> {
  const d = { ...data };
  // fields the client must never set directly
  for (const k of ["id", "published_snapshot", "published_at", "updated_by", "created_at", "password_hash", "bundled"]) delete d[k];
  if ((c === "brands" || c === "products") && typeof d.slug === "string") {
    d.slug = slugify(d.slug) || newId().slice(0, 8);
  }
  if (c === "brands" && d.accent_color && !isHex(String(d.accent_color))) throw new Error("Accent colour must be a hex value like #1d5bd8");
  if (c === "social_links" && d.visible && !String(d.url ?? "").match(/^https?:\/\//)) {
    throw new Error("A visible social link needs a full URL starting with https://");
  }
  if (c === "locations") {
    for (const k of ["latitude", "longitude"] as const) {
      const v = d[k];
      d[k] = v === "" || v == null ? null : Number(v);
      if (d[k] != null && Number.isNaN(d[k])) throw new Error(`${k} must be a number`);
    }
  }
  if (c === "marketing_pixels") {
    const provider = String(d.provider ?? "") as keyof typeof PIXEL_INFO;
    if (d.enabled && !validPixelId(provider, String(d.pixel_id ?? ""))) {
      throw new Error(`${PIXEL_INFO[provider]?.name ?? "Pixel"} ID is not valid (example: ${PIXEL_INFO[provider]?.example}). It stays disabled.`);
    }
  }
  if (c === "distributor_requests" || c === "contact_messages") {
    // only workflow fields are editable on submissions
    const allowed = ["status", "internal_notes", "updated_at"];
    for (const k of Object.keys(d)) if (!allowed.includes(k)) delete d[k];
  }
  if (c === "media_library") {
    for (const k of Object.keys(d)) if (k !== "alt_json") delete d[k];
  }
  return d as Partial<Collections[K]>;
}

/* ------------------------------------------------------------------ */
/* Generic CRUD                                                        */
/* ------------------------------------------------------------------ */

export async function saveRecord<K extends CollectionName>(
  c: K,
  id: string | null,
  data: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await authorize(permFor(c));
    const clean = sanitize(c, data) as Record<string, unknown>;
    const now = new Date().toISOString();
    const stamp = ["page_sections", "brands", "products"].includes(c) ? { updated_at: now, updated_by: user.email } : {};
    if (id) {
      await db().update(c, id, { ...clean, ...stamp } as Partial<Collections[K]>);
      await audit(user.email, "update", c, id);
      refresh();
      return ok({ id });
    }
    const rows = await db().list(c);
    const maxOrder = Math.max(0, ...rows.map((r) => Number((r as { sort_order?: number }).sort_order ?? 0)));
    const newRow = {
      id: newId(c.replace(/_.*$/, "")),
      ...clean,
      ...("sort_order" in (rows[0] ?? { sort_order: 0 }) ? { sort_order: maxOrder + 1 } : {}),
      ...(["page_sections", "brands", "products"].includes(c) ? { published_snapshot: null, published_at: null, ...stamp } : {}),
    } as unknown as Collections[K];
    const saved = await db().insert(c, newRow);
    await audit(user.email, "create", c, (saved as { id: string }).id);
    refresh();
    return ok({ id: (saved as { id: string }).id });
  } catch (e) {
    return fail(e);
  }
}

export async function deleteRecord(c: CollectionName, id: string): Promise<ActionResult> {
  try {
    const user = await authorize(permFor(c));
    if (c === "media_library") return deleteMedia(id);
    if (c === "page_sections") {
      const s = await db().get("page_sections", id);
      if (s?.section_type === "video_story" && s.page_slug === "home") throw new Error("The homepage video story can be hidden but not deleted.");
    }
    await db().remove(c, id);
    await audit(user.email, "delete", c, id);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function duplicateRecord(c: CollectionName, id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await authorize(permFor(c));
    const row = (await db().get(c, id)) as Record<string, unknown> | null;
    if (!row) throw new Error("Not found");
    const copy: Record<string, unknown> = structuredClone(row);
    copy.id = newId(c.replace(/_.*$/, ""));
    if ("slug" in copy) copy.slug = `${copy.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
    if ("sort_order" in copy) copy.sort_order = Number(copy.sort_order) + 0.5;
    if ("published_snapshot" in copy) {
      copy.published_snapshot = null;
      copy.published_at = null;
      copy.updated_at = new Date().toISOString();
      copy.updated_by = user.email;
    }
    if ("name_json" in copy && copy.name_json && typeof copy.name_json === "object") {
      const n = copy.name_json as Record<string, string>;
      for (const l of Object.keys(n)) n[l] = `${n[l]} (copy)`;
    }
    await db().insert(c, copy as unknown as Collections[typeof c]);
    // normalise order
    const rows = (await db().list(c)) as unknown as { id: string; sort_order?: number }[];
    if (rows[0] && "sort_order" in rows[0]) await db().reorder(c, rows.map((r) => r.id));
    await audit(user.email, "duplicate", c, copy.id as string);
    refresh();
    return ok({ id: copy.id as string });
  } catch (e) {
    return fail(e);
  }
}

export async function reorderRecords(c: CollectionName, ids: string[]): Promise<ActionResult> {
  try {
    const user = await authorize(permFor(c));
    await db().reorder(c, ids);
    await audit(user.email, "reorder", c, ids.length + " items");
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function setVisible(c: CollectionName, id: string, visible: boolean): Promise<ActionResult> {
  try {
    const user = await authorize(permFor(c));
    if (c === "social_links" && visible) {
      const s = await db().get("social_links", id);
      if (!s?.url.match(/^https?:\/\//)) throw new Error("Add the profile URL before showing this platform.");
    }
    await db().update(c, id, { visible } as never);
    await audit(user.email, visible ? "show" : "hide", c, id);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Publishing                                                          */
/* ------------------------------------------------------------------ */

export async function publishRecord(c: PublishableCollection, id: string, locales: Locale[] | "all" = "all"): Promise<ActionResult> {
  try {
    const user = await authorize("content.write");
    const row = (await db().get(c, id)) as Record<string, unknown> | null;
    if (!row) throw new Error("Not found");
    const draft = draftOf(c, row);
    const snapshot = mergeForPublish(draft, row.published_snapshot ?? undefined, locales) as Record<string, unknown>;
    const now = new Date().toISOString();
    await db().update(c, id, { published_snapshot: snapshot, published_at: now, updated_by: user.email, is_placeholder: false } as never);
    await audit(user.email, `publish${locales === "all" ? "" : ":" + locales.join(",")}`, c, id);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function unpublishRecord(c: PublishableCollection, id: string): Promise<ActionResult> {
  try {
    const user = await authorize("content.write");
    await db().update(c, id, { published_snapshot: null, published_at: null, updated_by: user.email } as never);
    await audit(user.email, "unpublish", c, id);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function revertToPublished(c: PublishableCollection, id: string): Promise<ActionResult> {
  try {
    const user = await authorize("content.write");
    const row = (await db().get(c, id)) as Record<string, unknown> | null;
    if (!row?.published_snapshot) throw new Error("Nothing published to revert to");
    await db().update(c, id, { ...(row.published_snapshot as object), updated_at: new Date().toISOString(), updated_by: user.email } as never);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Page builder                                                        */
/* ------------------------------------------------------------------ */

export async function addSection(page: string, type: string): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await authorize("content.write");
    if (!(PAGE_SLUGS as readonly string[]).includes(page)) throw new Error("Unknown page");
    if (!(SECTION_TYPES as readonly string[]).includes(type)) throw new Error("Unknown section type");
    const def = SECTION_DEFINITIONS[type as SectionType];
    const existing = (await db().list("page_sections")).filter((s) => s.page_slug === page);
    if (def.singleton && existing.some((s) => s.section_type === type)) throw new Error(`${def.name} can only be added once per page`);
    const row: PageSection = {
      id: newId("sec"),
      page_slug: page as PageSection["page_slug"],
      section_type: type as SectionType,
      content_json: emptyContent(def.fields),
      visible: false,
      sort_order: Math.max(0, ...existing.map((s) => s.sort_order)) + 1,
      published_snapshot: null,
      published_at: null,
      updated_at: new Date().toISOString(),
      updated_by: user.email,
    };
    await db().insert("page_sections", row);
    await audit(user.email, "create", "page_sections", row.id);
    refresh();
    return ok({ id: row.id });
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const SETTING_PERMS: Record<SettingKey, Permission> = {
  general: "settings.write",
  appearance: "settings.write",
  footer: "settings.write",
  consent: "settings.write",
  ui_strings: "content.write",
};

export async function saveSetting<K extends SettingKey>(key: K, value: SiteSettingsMap[K]): Promise<ActionResult> {
  try {
    const user = await authorize(SETTING_PERMS[key]);
    if (key === "appearance") {
      const a = value as SiteSettingsMap["appearance"];
      for (const k of ["primary", "navy", "background", "text", "muted", "border"] as const) {
        if (!isHex(a[k])) throw new Error(`${k} must be a 6-digit hex colour`);
      }
      const checks: [string, string, string, number][] = [
        ["Text on background", a.text, a.background, 4.5],
        ["Muted text on background", a.muted, a.background, 4.5],
        ["White on primary (buttons)", "#ffffff", a.primary, 3],
        ["White on navy (buttons)", "#ffffff", a.navy, 4.5],
      ];
      const bad = checks.filter(([, f, b, min]) => contrast(f, b) < min);
      if (bad.length) {
        throw new Error(
          "Not saved: these colours would make text hard to read — " +
            bad.map(([n, f, b, min]) => `${n} is ${contrast(f, b).toFixed(2)}:1 (needs ${min}:1)`).join("; "),
        );
      }
      a.card_radius = Math.min(48, Math.max(0, Number(a.card_radius)));
      a.button_radius = Math.min(999, Math.max(0, Number(a.button_radius)));
      a.section_spacing = Math.min(240, Math.max(48, Number(a.section_spacing)));
    }
    if (key === "general") {
      const g = value as SiteSettingsMap["general"];
      g.enabled_locales = g.enabled_locales.filter((l) => (LOCALES as readonly string[]).includes(l));
      if (!g.enabled_locales.length) throw new Error("At least one language must stay enabled");
      if (!g.enabled_locales.includes(g.default_locale)) throw new Error("The default language must be enabled");
      for (const k of ["general_email", "distributor_email"] as const) {
        if (g[k] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g[k])) throw new Error(`${k.replace("_", " ")} is not a valid email`);
      }
      for (const k of ["factory_latitude", "factory_longitude"] as const) {
        const v = g[k] as unknown;
        g[k] = v === "" || v == null ? null : Number(v);
      }
      g.distributor_extra_fields = g.distributor_extra_fields.map((f) => ({ ...f, key: slugify(f.key).replace(/-/g, "_") || newId().slice(0, 6) }));
    }
    await db().setSetting(key, value);
    await audit(user.email, "update", "site_settings", key);
    refresh();
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

async function deleteMedia(id: string): Promise<ActionResult> {
  const user = await authorize("media.write");
  const item = await db().get("media_library", id);
  if (!item) throw new Error("Not found");
  if (item.bundled) throw new Error("This file ships with the site and cannot be deleted. Upload a replacement and switch references instead.");
  await mediaStorage().remove(item.storage_path);
  await db().remove("media_library", id);
  await audit(user.email, "delete", "media_library", id);
  refresh();
  return ok();
}

/** Every place a URL is referenced, for the "in use" warning before deleting/replacing. */
export async function mediaUsage(url: string): Promise<string[]> {
  await authorize("read");
  const where: string[] = [];
  const hit = (v: unknown) => JSON.stringify(v ?? "").includes(url);
  for (const s of await db().list("page_sections"))
    if (hit(s.content_json) || hit(s.published_snapshot)) where.push(`Page "${s.page_slug}" › ${SECTION_DEFINITIONS[s.section_type]?.name}`);
  for (const b of await db().list("brands")) if (hit(b)) where.push(`Brand "${b.name_json.en ?? b.slug}"`);
  for (const p of await db().list("products")) if (hit(p)) where.push(`Product "${p.name_json.en ?? p.slug}"`);
  for (const s of await db().list("seo_entries")) if (hit(s)) where.push(`SEO ${s.route}`);
  if (hit(await db().getSetting("appearance"))) where.push("Appearance (logo / favicon)");
  return where;
}

/** Replace: point every reference of oldUrl to newUrl (used after uploading a replacement). */
export async function replaceMediaReferences(oldUrl: string, newUrl: string): Promise<ActionResult<number>> {
  try {
    const user = await authorize("content.write");
    let n = 0;
    const swap = <T,>(v: T): T => JSON.parse(JSON.stringify(v).split(JSON.stringify(oldUrl).slice(1, -1)).join(JSON.stringify(newUrl).slice(1, -1)));
    for (const c of ["page_sections", "brands", "products"] as const) {
      for (const r of await db().list(c)) {
        const s = JSON.stringify(r);
        if (!s.includes(oldUrl)) continue;
        const next = swap(r) as unknown as Record<string, unknown>;
        delete next.id;
        await db().update(c, r.id, next as never);
        n++;
      }
    }
    const a = await db().getSetting("appearance");
    if (JSON.stringify(a).includes(oldUrl)) {
      await db().setSetting("appearance", swap(a));
      n++;
    }
    await audit(user.email, "replace-media", "media_library", oldUrl);
    refresh();
    return ok(n);
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* Users & roles                                                       */
/* ------------------------------------------------------------------ */

export async function createUser(input: { email: string; full_name: string; role: Role; password: string }): Promise<ActionResult> {
  try {
    const me = await authorize("users.manage");
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email");
    if (!["admin", "editor", "viewer"].includes(input.role)) throw new Error("Unknown role");
    if (input.password.length < 10) throw new Error("Password must be at least 10 characters");
    const existing = await db().list("profiles");
    if (existing.some((p) => p.email === email)) throw new Error("A user with this email already exists");
    let id = newId("user");
    let password_hash: string | undefined = await hashPassword(input.password);
    if (backend() === "supabase") {
      const { data, error } = await serviceClient().auth.admin.createUser({ email, password: input.password, email_confirm: true });
      if (error || !data.user) throw new Error(error?.message ?? "Could not create the auth user");
      id = data.user.id;
      password_hash = undefined;
    }
    const profile: Profile = { id, email, full_name: input.full_name.trim(), role: input.role, active: true, created_at: new Date().toISOString() };
    if (password_hash) profile.password_hash = password_hash;
    await db().insert("profiles", profile);
    await audit(me.email, "create-user", "profiles", id);
    revalidatePath("/admin/users");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function updateUser(id: string, patch: { role?: Role; active?: boolean; full_name?: string; password?: string }): Promise<ActionResult> {
  try {
    const me = await authorize("users.manage");
    const users = await db().list("profiles");
    const target = users.find((u) => u.id === id);
    if (!target) throw new Error("User not found");
    const next: Partial<Profile> = {};
    if (patch.full_name !== undefined) next.full_name = patch.full_name.trim();
    if (patch.role) {
      if (!["admin", "editor", "viewer"].includes(patch.role)) throw new Error("Unknown role");
      next.role = patch.role;
    }
    if (patch.active !== undefined) next.active = patch.active;
    // never lock the site out of its last active admin
    const wouldLoseAdmin = (next.role && next.role !== "admin") || next.active === false;
    if (target.role === "admin" && wouldLoseAdmin && users.filter((u) => u.role === "admin" && u.active).length <= 1) {
      throw new Error("There must always be at least one active admin");
    }
    if (patch.password) {
      if (patch.password.length < 10) throw new Error("Password must be at least 10 characters");
      if (backend() === "supabase") {
        const { error } = await serviceClient().auth.admin.updateUserById(id, { password: patch.password });
        if (error) throw new Error(error.message);
      } else next.password_hash = await hashPassword(patch.password);
    }
    await db().update("profiles", id, next);
    await audit(me.email, "update-user", "profiles", id);
    revalidatePath("/admin/users");
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------------------------------------------ */
/* AI drafts (optional). Uses ANTHROPIC_API_KEY when set, otherwise    */
/* GEMINI_API_KEY (Google AI Studio has a free tier).                  */
/* ------------------------------------------------------------------ */

const LANG_NAMES: Record<Locale, string> = { en: "English", fr: "French", ar: "Arabic (Modern Standard, as used in Algeria)" };

type AiImage = { mediaType: string; base64: string };

let geminiModel: string | undefined;
// least reasoning first; a model that rejects a setting (HTTP 400) gets the next one
const GEMINI_THINKING = [{ thinkingBudget: 0 }, { thinkingLevel: "low" }, undefined] as const;
let geminiThinkingStep = 0;

/** Google's own error message, short enough for a toast. */
function googleMessage(body: string) {
  try {
    return String((JSON.parse(body) as { error?: { message?: string } }).error?.message ?? "").slice(0, 200);
  } catch {
    return body.slice(0, 120);
  }
}

/** Lists the Flash models this Gemini key may call, newest first (full Flash before Lite). */
async function listGeminiModels(base: string, key: string): Promise<string[]> {
  const res = await fetch(`${base}/v1beta/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!res.ok) return [];
  const json = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  const names = (json.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /flash/.test(n) && !/(image|tts|audio|live|thinking|exp|preview|8b)/.test(n));
  const version = (n: string) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  names.sort((a, b) => version(b) - version(a) || Number(/lite/.test(a)) - Number(/lite/.test(b)) || a.length - b.length);
  console.log("Gemini models available:", names.slice(0, 8).join(", "));
  return names.slice(0, 5);
}

/** One prompt in, plain text out, from whichever AI provider is configured. */
async function aiComplete({ system, text, image, maxTokens }: { system: string; text: string; image?: AiImage; maxTokens: number }) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOODMAXAPIgemini; // second name is the one set in Vercel
  if (anthropicKey) {
    const content = [
      ...(image ? [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } }] : []),
      { type: "text", text },
    ];
    const res = await fetch(`${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content }],
      }),
    });
    if (!res.ok) throw new Error(`AI service returned ${res.status}`);
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    return json.content?.find((b) => b.type === "text")?.text?.trim() ?? "";
  }
  if (geminiKey) {
    const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
    // Vercel stops the function at maxDuration (300s on the product page); all Gemini calls share a 270s budget,
    // and one slow model is given up after 90s so another one can be tried.
    const started = Date.now();
    const deadline = started + 270_000;
    const attempts: string[] = [];
    const send = async (model: string) => {
      const t0 = Date.now();
      const thinking = GEMINI_THINKING[geminiThinkingStep];
      const r = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": geminiKey },
        signal: AbortSignal.timeout(Math.max(1000, Math.min(90_000, deadline - Date.now()))),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [...(image ? [{ inline_data: { mime_type: image.mediaType, data: image.base64 } }] : []), { text }] }],
          // room left in case a model reasons before answering
          generationConfig: { maxOutputTokens: maxTokens + 4000, ...(thinking ? { thinkingConfig: thinking } : {}) },
        }),
      }).catch((e: Error) => {
        if (e.name !== "TimeoutError" && e.name !== "AbortError") throw e;
        // a stand-in 504 lets the loop below move on to the next model
        return new Response("no answer in time", { status: 504 });
      });
      attempts.push(`${model} ${r.status} ${Math.round((Date.now() - t0) / 1000)}s`);
      return r;
    };
    const call = async (model: string) => {
      let r = await send(model);
      // reasoning is slow and not needed for copywriting: ask for as little as the model accepts
      while (r.status === 400 && geminiThinkingStep < GEMINI_THINKING.length - 1) {
        const body = await r.text();
        if (!/think/i.test(body)) return new Response(body, { status: 400 }); // a different problem, e.g. the key
        geminiThinkingStep++;
        r = await send(model);
      }
      return r;
    };
    // Free-tier models are often busy (503), slow (504) or retired (404): retry once, then move on to other Flash models this key can use.
    const tried = new Set<string>();
    let queue = [geminiModel ?? process.env.GEMINI_MODEL ?? "gemini-flash-latest"];
    let listed = false;
    let res: Response | undefined;
    let errorText = "";
    while (queue.length && deadline - Date.now() > 20_000) {
      const model = queue.shift()!;
      if (tried.has(model)) continue;
      tried.add(model);
      res = await call(model);
      if ((res.status === 503 || res.status === 500) && deadline - Date.now() > 20_000) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await call(model);
      }
      if (res.ok) {
        geminiModel = model;
        const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
        return (json.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text ?? "").join("").trim();
      }
      errorText = await res.text();
      console.error("Gemini error", res.status, model, errorText.slice(0, 500));
      if (res.status === 429 || ![404, 500, 503, 504].includes(res.status)) break;
      if (!listed) {
        listed = true;
        queue = [...queue, ...(await listGeminiModels(base, geminiKey))];
      }
    }
    // the details in brackets let us see what Google answered without access to the server logs
    const detail = ` [${attempts.join(", ")}${googleMessage(errorText) ? ` | ${googleMessage(errorText)}` : ""}]`;
    if (res?.status === 429) throw new Error(`The free AI quota is used up for now. Try again later.${detail}`);
    if (res?.status === 503) throw new Error(`Google's AI is busy right now. Wait a minute and try again.${detail}`);
    if (res?.status === 504) throw new Error(`Google's AI did not answer in time. Try again in a minute.${detail}`);
    throw new Error(`AI service returned ${res?.status ?? "no answer"}.${detail}`);
  }
  throw new Error("AI drafts need GEMINI_API_KEY (free) or ANTHROPIC_API_KEY in the environment.");
}

export async function draftTranslation(text: string, from: Locale, to: Locale): Promise<ActionResult<string>> {
  try {
    await authorize("content.write");
    if (!text.trim()) throw new Error("Nothing to translate");
    const out = await aiComplete({
      system:
        "You translate short website copy for a premium shaving-products brand. Keep line breaks, brand names (GOODMAX) and numbers unchanged. Reply with the translation only.",
      text: `Translate from ${LANG_NAMES[from]} to ${LANG_NAMES[to]}:\n\n${text}`,
      maxTokens: 2000,
    });
    if (!out) throw new Error("Empty translation");
    return ok(out);
  } catch (e) {
    return fail(e);
  }
}

export type ProductDraft = {
  name_json: Record<Locale, string>;
  short_description_json: Record<Locale, string>;
  description_json: Record<Locale, string>;
  alt_json: Record<Locale, string>;
  seo_json: { title: Record<Locale, string>; description: Record<Locale, string> };
  features: { title_json: Record<Locale, string>; body_json: Record<Locale, string> }[];
};

const PRODUCT_DRAFT_PROMPT = `You write product copy for GOODMAX, an Algerian brand of shaving products, from a single product photo.
Rules:
- Describe only what is visible in the photo (shape, number of blades you can count, colours, grip texture, parts such as a comfort strip or pivot head). Never invent specifications, materials, certifications, prices or claims you cannot see.
- If the photo does not show a product clearly, return empty strings.
- Write natural marketing copy in English, French and Arabic (Modern Standard Arabic). Keep the brand name GOODMAX in Latin letters.
- name: short product name (max 5 words). short: one sentence. long: 2-3 sentences. alt: a plain description of the photo for screen readers.
- features: 3 to 5 technical characteristics visible in the photo (e.g. blade count, head, strip, handle, grip), each with a short title and a one-sentence detail saying the benefit it gives the user.
- seo_title: search-engine title, max 60 characters, including the product name and GOODMAX. seo_description: max 155 characters, one sentence that makes people click.
Reply with JSON only, no markdown, in exactly this shape:
{"name":{"en":"","fr":"","ar":""},"short":{"en":"","fr":"","ar":""},"long":{"en":"","fr":"","ar":""},"alt":{"en":"","fr":"","ar":""},"features":[{"title":{"en":"","fr":"","ar":""},"detail":{"en":"","fr":"","ar":""}}],"seo_title":{"en":"","fr":"","ar":""},"seo_description":{"en":"","fr":"","ar":""}}`;

/** Drafts product name, descriptions and visible characteristics in EN/FR/AR from one photo. */
export async function draftProductFromImage(imageBase64: string, mediaType: string): Promise<ActionResult<ProductDraft>> {
  try {
    await authorize("content.write");
    if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) throw new Error("Use a JPEG, PNG or WebP image.");
    if (!imageBase64 || imageBase64.length > 7_000_000) throw new Error("Image is missing or too large.");
    const text = await aiComplete({
      system: PRODUCT_DRAFT_PROMPT,
      text: "Write the GOODMAX product copy for this photo.",
      image: { mediaType, base64: imageBase64 },
      maxTokens: 3000,
    });
    const raw = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    type L = Partial<Record<Locale, unknown>>;
    const parsed = JSON.parse(raw) as { name?: L; short?: L; long?: L; alt?: L; seo_title?: L; seo_description?: L; features?: { title?: L; detail?: L }[] };
    const loc = (o?: L) => Object.fromEntries(LOCALES.map((l) => [l, typeof o?.[l] === "string" ? (o[l] as string).trim().slice(0, 2000) : ""])) as Record<Locale, string>;
    const draft: ProductDraft = {
      name_json: loc(parsed.name),
      short_description_json: loc(parsed.short),
      description_json: loc(parsed.long),
      alt_json: loc(parsed.alt),
      seo_json: { title: loc(parsed.seo_title), description: loc(parsed.seo_description) },
      features: (Array.isArray(parsed.features) ? parsed.features : []).slice(0, 6).map((f) => ({ title_json: loc(f.title), body_json: loc(f.detail) })),
    };
    if (!draft.name_json.en && !draft.short_description_json.en) throw new Error("The AI could not see a product in this image.");
    return ok(draft);
  } catch (e) {
    return fail(e instanceof SyntaxError ? new Error("The AI reply could not be read. Try again.") : e);
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function loginAction(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const res = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!res.ok) return { error: res.error === "inactive" ? "This account is deactivated." : "Email or password is incorrect." };
  redirect("/admin");
}

export async function logoutAction() {
  await signOut();
  redirect("/admin/login");
}
