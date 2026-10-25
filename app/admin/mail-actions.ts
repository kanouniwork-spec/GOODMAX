"use server";

import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/session";
import { db, newId } from "@/lib/data";
import type { ActionResult } from "./actions";
import { addAlias, addUser, disconnect, getConnection, listAccounts, listUsers, replyMessage, sendMessage, type Outgoing } from "@/lib/zoho/mail";

const ok = <T,>(data?: T): ActionResult<T> => ({ ok: true, data });
const fail = (e: unknown): ActionResult<never> => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

async function audit(actor: string, action: string, entity_id: string) {
  try {
    await db().insert("audit_log", { id: newId("log"), actor, action, entity: "zoho_mail", entity_id, created_at: new Date().toISOString() });
  } catch {
    /* audit is best-effort */
  }
}

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[a-z]{2,}$/i;
const LOCAL = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

/** "a@x.com, b@y.com" → a clean comma list, or an error naming the bad entry. */
function addressList(value: string | undefined, label: string, required = false) {
  const list = (value ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (required && !list.length) throw new Error(`Add at least one address in ${label}.`);
  if (list.length > 50) throw new Error(`${label}: at most 50 addresses.`);
  for (const a of list) if (!EMAIL.test(a)) throw new Error(`${label}: “${a}” is not an email address.`);
  return list.join(",");
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const toHtml = (text: string) => `<div style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(text)}</div>`;

type Draft = { from: string; to: string; cc?: string; bcc?: string; subject: string; body: string };

/** The account that may send from this address (its own address or one of its aliases). */
async function prepare(d: Draft): Promise<{ accountId: string; out: Outgoing }> {
  const from = d.from.trim().toLowerCase();
  const account = (await listAccounts()).find((a) => a.from.includes(from));
  if (!account) throw new Error(`Zoho does not allow sending from ${d.from}.`);
  const subject = d.subject.trim();
  if (subject.length > 300) throw new Error("The subject is too long.");
  if (!d.body.trim()) throw new Error("Write a message first.");
  if (d.body.length > 100_000) throw new Error("The message is too long.");
  return {
    accountId: account.accountId,
    out: { from, to: addressList(d.to, "To", true), cc: addressList(d.cc, "Cc"), bcc: addressList(d.bcc, "Bcc"), subject: subject || "(no subject)", html: toHtml(d.body) },
  };
}

export async function sendMail(d: Draft): Promise<ActionResult> {
  try {
    const user = await authorize("mail.manage");
    const { accountId, out } = await prepare(d);
    await sendMessage(accountId, out);
    await audit(user.id, "mail.send", out.to.slice(0, 200));
    return ok();
  } catch (e) {
    return fail(e);
  }
}

export async function replyMail(messageId: string, d: Draft): Promise<ActionResult> {
  try {
    const user = await authorize("mail.manage");
    if (!/^\d{1,30}$/.test(messageId)) throw new Error("Unknown message.");
    const { accountId, out } = await prepare(d);
    await replyMessage(accountId, messageId, out);
    await audit(user.id, "mail.reply", out.to.slice(0, 200));
    return ok();
  } catch (e) {
    return fail(e);
  }
}

/** Company addresses must be on the mail domain (the connected admin's own domain, goodmaxdz.com). */
async function domain() {
  const conn = await getConnection();
  return (conn?.email.split("@")[1] || "goodmaxdz.com").toLowerCase();
}

function localPart(v: string) {
  const l = v.trim().toLowerCase().replace(/@.*$/, "");
  if (!LOCAL.test(l)) throw new Error("Use letters, numbers, dots, dashes or underscores before the @ (for example contact).");
  return l;
}

export async function addMailAlias(zuid: string, local: string): Promise<ActionResult<string>> {
  try {
    const user = await authorize("mail.manage");
    const address = `${localPart(local)}@${await domain()}`;
    const users = await listUsers();
    const owner = users.find((u) => u.zuid === zuid);
    if (!owner) throw new Error("Pick the mailbox the address should arrive in.");
    if (users.some((u) => u.email === address || u.aliases.includes(address))) throw new Error(`${address} already exists.`);
    await addAlias(zuid, address);
    await audit(user.id, "mail.alias.add", address);
    revalidatePath("/admin/mail");
    return ok(address);
  } catch (e) {
    return fail(e);
  }
}

export async function createMailbox(input: { local: string; firstName: string; lastName: string; password: string }): Promise<ActionResult<string>> {
  try {
    const user = await authorize("mail.manage");
    const address = `${localPart(input.local)}@${await domain()}`;
    if (input.password.length < 10) throw new Error("The first password needs at least 10 characters.");
    if (input.password.length > 100) throw new Error("The password is too long.");
    const firstName = input.firstName.trim().slice(0, 60);
    const lastName = input.lastName.trim().slice(0, 60);
    if (!firstName) throw new Error("Add the person's first name.");
    const users = await listUsers();
    if (users.some((u) => u.email === address || u.aliases.includes(address))) throw new Error(`${address} already exists.`);
    await addUser({ email: address, password: input.password, firstName, lastName });
    await audit(user.id, "mail.mailbox.create", address);
    revalidatePath("/admin/mail");
    return ok(address);
  } catch (e) {
    return fail(e);
  }
}

export async function disconnectMail(): Promise<ActionResult> {
  try {
    const user = await authorize("mail.manage");
    const conn = await getConnection();
    await disconnect();
    await audit(user.id, "mail.disconnect", conn?.email ?? "");
    revalidatePath("/admin/mail");
    return ok();
  } catch (e) {
    return fail(e);
  }
}
