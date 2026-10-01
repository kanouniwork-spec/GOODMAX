import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { CollectionName, Collections, SettingKey, SiteSettingsMap } from "@/types/content";
import { buildSeed, DEFAULT_SETTINGS, type Database } from "@/data/seed";
import type { DataStore, MediaStorage, StoredFile } from "./types";
import { ensureBootstrapAdmin } from "@/lib/auth/bootstrap";

/**
 * Local JSON database. Real persistence for development and self-hosted
 * previews: every Save / Delete / Publish writes ./.data/db.json.
 * On read-only serverless hosts it falls back to /tmp and reports itself as
 * ephemeral so Admin can warn that changes are temporary.
 */
export function dataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return "/tmp/goodmax-data";
  return path.join(process.cwd(), ".data");
}

const dbFile = () => path.join(dataDir(), "db.json");

type Global = typeof globalThis & { __goodmaxDb?: Promise<Database>; __goodmaxLock?: Promise<unknown> };
const g = globalThis as Global;

async function load(): Promise<Database> {
  if (!g.__goodmaxDb) {
    g.__goodmaxDb = (async () => {
      await fs.mkdir(dataDir(), { recursive: true });
      let db: Database;
      try {
        db = JSON.parse(await fs.readFile(dbFile(), "utf8")) as Database;
        // Collections added after the file was created
        const seed = buildSeed();
        for (const k of Object.keys(seed.collections) as CollectionName[]) {
          if (!db.collections[k]) (db.collections as Record<string, unknown[]>)[k] = seed.collections[k];
        }
      } catch {
        db = buildSeed();
      }
      await ensureBootstrapAdmin(db.collections.profiles, dataDir());
      await persist(db);
      return db;
    })();
  }
  return g.__goodmaxDb;
}

async function persist(db: Database) {
  const tmp = dbFile() + "." + process.pid + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 1));
  await fs.rename(tmp, dbFile());
}

/** Serialises writes so concurrent requests cannot interleave. */
function withLock<T>(fn: (db: Database) => Promise<T> | T): Promise<T> {
  const run = (g.__goodmaxLock ?? Promise.resolve()).then(async () => {
    const db = await load();
    const result = await fn(db);
    await persist(db);
    return result;
  });
  g.__goodmaxLock = run.catch(() => undefined);
  return run;
}

const clone = <T>(v: T): T => structuredClone(v);

function sorted<T>(rows: T[]): T[] {
  const r = rows as unknown as Record<string, unknown>[];
  if (r.length && "sort_order" in r[0]) {
    return [...rows].sort((a, b) => ((a as { sort_order: number }).sort_order ?? 0) - ((b as { sort_order: number }).sort_order ?? 0));
  }
  if (r.length && "created_at" in r[0]) {
    return [...rows].sort((a, b) => String((b as { created_at: string }).created_at).localeCompare(String((a as { created_at: string }).created_at)));
  }
  if (r.length && "code" in r[0]) return [...rows].sort((a, b) => (a as { code: number }).code - (b as { code: number }).code);
  return rows;
}

export class FileStore implements DataStore {
  readonly kind = "file" as const;
  readonly ephemeral = Boolean(process.env.VERCEL) && !process.env.DATA_DIR;

  async list<K extends CollectionName>(c: K): Promise<Collections[K][]> {
    const db = await load();
    return clone(sorted(db.collections[c] as Collections[K][]));
  }
  async get<K extends CollectionName>(c: K, id: string) {
    const db = await load();
    const row = (db.collections[c] as Collections[K][]).find((r) => (r as { id: string }).id === id);
    return row ? clone(row) : null;
  }
  insert<K extends CollectionName>(c: K, row: Collections[K]) {
    return withLock((db) => {
      (db.collections[c] as Collections[K][]).push(clone(row));
      return clone(row);
    });
  }
  update<K extends CollectionName>(c: K, id: string, patch: Partial<Collections[K]>) {
    return withLock((db) => {
      const rows = db.collections[c] as Collections[K][];
      const i = rows.findIndex((r) => (r as { id: string }).id === id);
      if (i < 0) throw new Error(`${c}/${id} not found`);
      rows[i] = { ...rows[i], ...clone(patch) };
      return clone(rows[i]);
    });
  }
  remove<K extends CollectionName>(c: K, id: string) {
    return withLock((db) => {
      (db.collections as Record<string, unknown[]>)[c] = (db.collections[c] as { id: string }[]).filter((r) => r.id !== id);
    });
  }
  reorder<K extends CollectionName>(c: K, orderedIds: string[]) {
    return withLock((db) => {
      for (const r of db.collections[c] as unknown as { id: string; sort_order: number }[]) {
        const i = orderedIds.indexOf(r.id);
        if (i >= 0) r.sort_order = i + 1;
      }
    });
  }
  async getSetting<K extends SettingKey>(key: K): Promise<SiteSettingsMap[K]> {
    const db = await load();
    const stored = db.settings[key];
    const def = DEFAULT_SETTINGS[key];
    if (stored && typeof def === "object" && !Array.isArray(def)) return clone({ ...def, ...stored }) as SiteSettingsMap[K];
    return clone((stored ?? def) as SiteSettingsMap[K]);
  }
  setSetting<K extends SettingKey>(key: K, value: SiteSettingsMap[K]) {
    return withLock((db) => {
      db.settings[key] = clone(value);
    });
  }
}

/** Uploaded files live in .data/uploads and are served by /api/media/[...path]. */
export class FileMediaStorage implements MediaStorage {
  async put(fileName: string, _mime: string, bytes: Uint8Array): Promise<StoredFile> {
    const safe = fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-80);
    const rel = `${Date.now().toString(36)}-${safe}`;
    const dir = path.join(dataDir(), "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, rel), bytes);
    return { storage_path: rel, public_url: `/api/media/${rel}` };
  }
  async remove(storagePath: string) {
    if (storagePath.startsWith("bundled/")) return;
    await fs.rm(path.join(dataDir(), "uploads", path.basename(storagePath)), { force: true });
  }
}
