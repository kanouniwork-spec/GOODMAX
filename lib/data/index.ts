import "server-only";
import type { DataStore, MediaStorage } from "./types";
import { FileMediaStorage, FileStore } from "./file-store";
import { SupabaseMediaStorage, SupabaseStore } from "./supabase-store";

export function backend(): "file" | "supabase" {
  const explicit = process.env.DATA_BACKEND;
  if (explicit === "file" || explicit === "supabase") return explicit;
  return process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "file";
}

let store: DataStore | null = null;
let media: MediaStorage | null = null;

export function db(): DataStore {
  if (!store) store = backend() === "supabase" ? new SupabaseStore() : new FileStore();
  return store;
}

export function mediaStorage(): MediaStorage {
  if (!media) media = backend() === "supabase" ? new SupabaseMediaStorage() : new FileMediaStorage();
  return media;
}

export const newId = (prefix = "") => `${prefix}${prefix ? "-" : ""}${crypto.randomUUID()}`;
