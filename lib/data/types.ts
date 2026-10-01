import type { CollectionName, Collections, SettingKey, SiteSettingsMap } from "@/types/content";

/**
 * The one interface every backend implements. Pages, server actions and admin
 * modules only ever talk to this, so swapping the local file store for
 * Supabase is a configuration change, not a code change.
 */
export interface DataStore {
  readonly kind: "file" | "supabase";
  /** True when writes do not survive a restart (e.g. file store on a read-only serverless host). */
  readonly ephemeral: boolean;
  list<K extends CollectionName>(collection: K): Promise<Collections[K][]>;
  get<K extends CollectionName>(collection: K, id: string): Promise<Collections[K] | null>;
  insert<K extends CollectionName>(collection: K, row: Collections[K]): Promise<Collections[K]>;
  update<K extends CollectionName>(
    collection: K,
    id: string,
    patch: Partial<Collections[K]>,
  ): Promise<Collections[K]>;
  remove<K extends CollectionName>(collection: K, id: string): Promise<void>;
  /** Writes many sort_order values at once (drag-and-drop reordering). */
  reorder<K extends CollectionName>(collection: K, orderedIds: string[]): Promise<void>;
  getSetting<K extends SettingKey>(key: K): Promise<SiteSettingsMap[K]>;
  setSetting<K extends SettingKey>(key: K, value: SiteSettingsMap[K]): Promise<void>;
}

export interface StoredFile {
  storage_path: string;
  public_url: string;
}

export interface MediaStorage {
  put(fileName: string, mime: string, bytes: Uint8Array): Promise<StoredFile>;
  remove(storagePath: string): Promise<void>;
}
