import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/session";
import { listAccounts, uploadAttachment } from "@/lib/zoho/mail";
import { MAX_FILE_MB, safeFileName, takeUpload } from "@/lib/zoho/uploads";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin › Mail: puts one attachment in Zoho's file store of the mailbox that will send it. Either the file itself
 * (multipart: file, from) or, for files over Vercel's 4.5 MB limit, JSON {from, path, name} naming a file the
 * browser already uploaded to the private bucket (lib/zoho/uploads.ts).
 */
export async function POST(req: Request) {
  try {
    await authorize("mail.manage");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
  try {
    let from = "";
    let name = "";
    let bytes: Uint8Array;
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      const body = (await req.json()) as { from?: string; path?: string; name?: string };
      from = String(body.from ?? "");
      name = String(body.name ?? "");
      bytes = await takeUpload(String(body.path ?? ""));
    } else {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("No file.");
      if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Files can be up to ${MAX_FILE_MB} MB.`);
      from = String(form.get("from") ?? "");
      name = file.name;
      bytes = new Uint8Array(await file.arrayBuffer());
    }
    if (!bytes.length) throw new Error("The file is empty.");
    const account = (await listAccounts()).find((a) => a.from.includes(from.trim().toLowerCase()));
    if (!account) throw new Error(`Zoho does not allow sending from ${from}.`);
    const ref = await uploadAttachment(account.accountId, safeFileName(name), bytes);
    return NextResponse.json(ref);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}
