import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CollectionName, Collections, SettingKey, SiteSettingsMap } from "@/types/content";
import { DEFAULT_SETTINGS, buildSeed } from "@/data/seed";
import type { DataStore, MediaStorage, StoredFile } from "./types";

/**
 * Supabase adapter. Runs only on the server with the service-role key;
 * every write is authorised first by lib/auth (roles) and RLS remains the
 * second line of defence for anything using the anon key.
 * Table and column names match types/content.ts one-to-one
 * (see supabase/migrations/0001_init.sql).
 */
let client: SupabaseClient | null = null;
export function serviceClient() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const ORDER: Partial<Record<CollectionName, { column: string; ascending: boolean }>> = {
  distributor_requests: { column: "created_at", ascending: false },
  contact_messages: { column: "created_at", ascending: false },
  media_library: { column: "created_at", ascending: false },
  audit_log: { column: "created_at", ascending: false },
  profiles: { column: "created_at", ascending: true },
  wilayas: { column: "code", ascending: true },
  seo_entries: { column: "route", ascending: true },
  marketing_pixels: { column: "provider", ascending: true },
};

function fail(error: { message: string } | null, what: string) {
  if (error) throw new Error(`Supabase ${what}: ${error.message}`);
}

// insertion order respects foreign keys
const SEED_ORDER = ["pages", "page_sections", "brands", "products", "wilayas", "social_links", "media_library", "seo_entries", "marketing_pixels"] as const;
let seeding: Promise<void> | null = null;

/** Loads the starter content into an empty project on first use (safe to race: duplicates are ignored). */
function ensureSeeded(db: SupabaseClient) {
  seeding ??= (async () => {
    const { count, error } = await db.from("pages").select("id", { count: "exact", head: true });
    fail(error, "check seed");
    if (count) return;
    const seed = buildSeed();
    for (const table of SEED_ORDER) {
      const rows = seed.collections[table] as unknown[];
      if (!rows.length) continue;
      const res = await db.from(table).upsert(rows as never, { onConflict: "id", ignoreDuplicates: true });
      fail(res.error, `seed ${table}`);
    }
  })().catch((e) => {
    seeding = null;
    throw e;
  });
  return seeding;
}

export class SupabaseStore implements DataStore {
  readonly kind = "supabase" as const;
  readonly ephemeral = false;
  private db = serviceClient();

  async list<K extends CollectionName>(c: K): Promise<Collections[K][]> {
    await ensureSeeded(this.db);
    const o = ORDER[c] ?? { column: "sort_order", ascending: true };
    const { data, error } = await this.db.from(c).select("*").order(o.column, { ascending: o.ascending });
    fail(error, `list ${c}`);
    return (data ?? []) as Collections[K][];
  }
  async get<K extends CollectionName>(c: K, id: string) {
    await ensureSeeded(this.db);
    const { data, error } = await this.db.from(c).select("*").eq("id", id).maybeSingle();
    fail(error, `get ${c}`);
    return (data as Collections[K]) ?? null;
  }
  async insert<K extends CollectionName>(c: K, row: Collections[K]) {
    const { data, error } = await this.db.from(c).insert(row as never).select("*").single();
    fail(error, `insert ${c}`);
    return data as Collections[K];
  }
  async update<K extends CollectionName>(c: K, id: string, patch: Partial<Collections[K]>) {
    const { data, error } = await this.db.from(c).update(patch as never).eq("id", id).select("*").single();
    fail(error, `update ${c}`);
    return data as Collections[K];
  }
  async remove<K extends CollectionName>(c: K, id: string) {
    const { error } = await this.db.from(c).delete().eq("id", id);
    fail(error, `delete ${c}`);
  }
  async reorder<K extends CollectionName>(c: K, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map(async (id, i) => {
        const { error } = await this.db.from(c).update({ sort_order: i + 1 } as never).eq("id", id);
        fail(error, `reorder ${c}`);
      }),
    );
  }
  async getSetting<K extends SettingKey>(key: K): Promise<SiteSettingsMap[K]> {
    const { data, error } = await this.db.from("site_settings").select("value_json").eq("key", key).maybeSingle();
    fail(error, `get setting ${key}`);
    const def = DEFAULT_SETTINGS[key];
    const stored = data?.value_json as SiteSettingsMap[K] | undefined;
    if (stored && typeof def === "object") return { ...def, ...stored } as SiteSettingsMap[K];
    return (stored ?? def) as SiteSettingsMap[K];
  }
  async setSetting<K extends SettingKey>(key: K, value: SiteSettingsMap[K]) {
    const { error } = await this.db
      .from("site_settings")
      .upsert({ key, value_json: value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    fail(error, `set setting ${key}`);
  }
}

export class SupabaseMediaStorage implements MediaStorage {
  private bucket = process.env.SUPABASE_MEDIA_BUCKET || "media";
  async put(fileName: string, mime: string, bytes: Uint8Array): Promise<StoredFile> {
    const safe = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-80);
    const storage_path = `uploads/${Date.now().toString(36)}-${safe}`;
    const { error } = await serviceClient().storage.from(this.bucket).upload(storage_path, bytes, {
      contentType: mime,
      upsert: false,
      cacheControl: "31536000",
    });
    fail(error, "upload");
    const { data } = serviceClient().storage.from(this.bucket).getPublicUrl(storage_path);
    return { storage_path, public_url: data.publicUrl };
  }
  async remove(storagePath: string) {
    if (storagePath.startsWith("bundled/")) return;
    const { error } = await serviceClient().storage.from(this.bucket).remove([storagePath]);
    fail(error, "remove file");
  }
}
