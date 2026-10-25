import "server-only";
import { randomUUID } from "crypto";
import { serviceClient } from "@/lib/data/supabase-store";

/**
 * Vercel refuses request bodies over 4.5 MB, so a larger attachment goes from the browser straight to a private
 * Supabase bucket (signed upload), and the server hands it on to Zoho and deletes it right after.
 */
export const MAIL_BUCKET = "mail-uploads";
export const MAX_FILE_MB = 20;
const PATH = /^mail\/[0-9a-f-]{36}\/[^/]{1,180}$/;

let bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { error } = await serviceClient().storage.createBucket(MAIL_BUCKET, { public: false, fileSizeLimit: MAX_FILE_MB * 1024 * 1024 });
  if (error && !/exist/i.test(error.message)) throw new Error(`Upload storage: ${error.message}`);
  bucketReady = true;
}

export const safeFileName = (name: string) =>
  (name.normalize("NFC").replace(/[\\/\u0000-\u001f"<>|:*?]+/g, "_").trim() || "file").slice(-150);

export async function uploadSlot(fileName: string) {
  await ensureBucket();
  const path = `mail/${randomUUID()}/${safeFileName(fileName).replace(/[^\w.\-]+/g, "_")}`;
  const { data, error } = await serviceClient().storage.from(MAIL_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Upload storage: ${error?.message ?? "no upload address"}`);
  return { bucket: MAIL_BUCKET, path: data.path, token: data.token };
}

/** Reads a file the browser put in the bucket, then removes it. */
export async function takeUpload(path: string) {
  if (!PATH.test(path)) throw new Error("Unknown upload.");
  const bucket = serviceClient().storage.from(MAIL_BUCKET);
  try {
    const { data, error } = await bucket.download(path);
    if (error || !data) throw new Error(`Upload storage: ${error?.message ?? "file not found"}`);
    if (data.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Files can be up to ${MAX_FILE_MB} MB.`);
    return new Uint8Array(await data.arrayBuffer());
  } finally {
    await bucket.remove([path]).catch(() => undefined);
  }
}
