import "server-only";
import { siteUrl } from "@/lib/seo";
import { deleteSecret, getSecret, setSecret } from "./secrets";

/**
 * Zoho Mail behind Admin › Mail. The company mailboxes stay hosted by Zoho (MX records of goodmaxdz.com);
 * the site signs in once with OAuth ("Connect Zoho Mail") as the Zoho admin and then reads, sends and
 * manages addresses through the Zoho Mail REST API (https://www.zoho.com/mail/help/api/).
 *
 * Setup, done by the owner: a "Server-based Application" client at https://api-console.zoho.com with the
 * redirect URI `${siteUrl()}/api/admin/zoho/callback`, then ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in Vercel.
 */

const SECRET = "zoho_mail";
export const SCOPES = ["ZohoMail.accounts.READ", "ZohoMail.folders.READ", "ZohoMail.messages.ALL", "ZohoMail.organization.accounts.ALL"];

/** Zoho's own sign-in servers (one per data centre); the mail API is the matching mail.* host. */
const ACCOUNTS_HOST = /^accounts\.(zoho\.(com|eu|in|com\.au|jp|com\.cn|sa|ae|uk)|zohocloud\.ca)$/;

/** Local tests point sign-in and the API at a stand-in server. Never set on Vercel. */
const stub = () => (process.env.ZOHO_STUB_ORIGIN ?? "").replace(/\/$/, "");

export type ZohoConnection = {
  refreshToken: string;
  accountsServer: string;
  mailApi: string;
  email: string;
  zuid: string;
  zoid: string;
  connectedAt: string;
  connectedBy: string;
  accessToken?: string;
  accessExpires?: number;
};

export class ZohoError extends Error {
  constructor(
    message: string,
    readonly kind: "auth" | "api" = "api",
  ) {
    super(message);
  }
}

export function zohoConfig() {
  const clientId = process.env.ZOHO_CLIENT_ID?.trim();
  const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const redirectUri = () => `${siteUrl()}/api/admin/zoho/callback`;

export function authUrl(state: string) {
  const cfg = zohoConfig();
  if (!cfg) throw new ZohoError("ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are not set in Vercel yet.", "auth");
  const q = new URLSearchParams({
    scope: SCOPES.join(","),
    client_id: cfg.clientId,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    redirect_uri: redirectUri(),
    state,
  });
  return `${stub() || "https://accounts.zoho.com"}/oauth/v2/auth?${q}`;
}

/** The sign-in server Zoho names in the callback (accounts-server), accepted only if it is one of Zoho's. */
export function accountsServerFrom(value: string | null): string | null {
  if (stub()) return stub();
  if (!value) return "https://accounts.zoho.com";
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.port && ACCOUNTS_HOST.test(u.hostname) ? `https://${u.hostname}` : null;
  } catch {
    return null;
  }
}

const seconds = (t: { expires_in?: number; expires_in_sec?: number }) => {
  const v = Number(t.expires_in_sec ?? t.expires_in ?? 3600);
  return v > 86400 ? v / 1000 : v; // older Zoho answers gave milliseconds
};

async function tokenCall(server: string, params: Record<string, string>) {
  const res = await fetch(`${server}/oauth/v2/token`, {
    method: "POST",
    body: new URLSearchParams(params),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; expires_in_sec?: number; error?: string };
  if (!res.ok || !json.access_token) throw new ZohoError(`Zoho sign-in failed: ${json.error || `error ${res.status}`}`, "auth");
  return json as typeof json & { access_token: string };
}

/* ---------------- connection ---------------- */

export const getConnection = () => getSecret<ZohoConnection>(SECRET);

/** Finishes "Connect Zoho Mail": trades the one-time code for a lasting refresh token and saves it encrypted. */
export async function connect(code: string, accountsServer: string, by: string) {
  const cfg = zohoConfig();
  if (!cfg) throw new ZohoError("ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are not set in Vercel yet.", "auth");
  const t = await tokenCall(accountsServer, {
    grant_type: "authorization_code",
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: redirectUri(),
  });
  if (!t.refresh_token) throw new ZohoError("Zoho did not return a lasting sign-in. Remove this app under Zoho › My Account › Connected Apps, then connect again.", "auth");
  const conn: ZohoConnection = {
    refreshToken: t.refresh_token,
    accountsServer,
    mailApi: stub() || accountsServer.replace("://accounts.", "://mail."),
    email: "",
    zuid: "",
    zoid: "",
    connectedAt: new Date().toISOString(),
    connectedBy: by,
    accessToken: t.access_token,
    accessExpires: Date.now() + (seconds(t) - 120) * 1000,
  };
  const accounts = await call<RawAccount[]>(conn, "/api/accounts");
  const main = accounts.find((a) => a.type === "ZOHO_ACCOUNT") ?? accounts[0];
  conn.email = main?.primaryEmailAddress ?? "";
  conn.zuid = main?.zuid != null ? String(main.zuid) : "";
  conn.zoid = findZoid(accounts);
  await setSecret(SECRET, conn);
  return conn;
}

export async function disconnect() {
  const conn = await getConnection();
  if (conn) {
    // best effort: also withdraw the sign-in at Zoho
    await fetch(`${conn.accountsServer}/oauth/v2/token/revoke?token=${encodeURIComponent(conn.refreshToken)}`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000) }).catch(() => undefined);
  }
  await deleteSecret(SECRET);
}

/** The organisation id (zoid) comes with /api/accounts, though Zoho's reference does not list it; ZOHO_ORG_ID overrides. */
function findZoid(value: unknown): string {
  const seen: unknown[] = [value];
  while (seen.length) {
    const v = seen.pop();
    if (!v || typeof v !== "object") continue;
    for (const [k, x] of Object.entries(v)) {
      if (k.toLowerCase() === "zoid" && (typeof x === "number" || (typeof x === "string" && /^\d+$/.test(x)))) return String(x);
      if (x && typeof x === "object") seen.push(x);
    }
  }
  return JSON.stringify(value).match(/organization\/(\d+)/)?.[1] ?? "";
}

let refreshing: Promise<string> | null = null;
async function accessToken(conn: ZohoConnection, force: boolean) {
  if (!force && conn.accessToken && (conn.accessExpires ?? 0) > Date.now()) return conn.accessToken;
  refreshing ??= (async () => {
    const cfg = zohoConfig();
    if (!cfg) throw new ZohoError("ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are missing in Vercel.", "auth");
    const t = await tokenCall(conn.accountsServer, { grant_type: "refresh_token", refresh_token: conn.refreshToken, client_id: cfg.clientId, client_secret: cfg.clientSecret });
    conn.accessToken = t.access_token;
    conn.accessExpires = Date.now() + (seconds(t) - 120) * 1000;
    // shared with the site's other server instances, so Zoho's limit on new sign-ins is not reached
    await setSecret(SECRET, conn);
    return t.access_token;
  })().finally(() => (refreshing = null));
  return refreshing;
}

type CallInit = { method?: string; body?: unknown; bytes?: Uint8Array; timeout?: number };

async function call<T>(conn: ZohoConnection, path: string, init: CallInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${conn.mailApi}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${await accessToken(conn, attempt > 0)}`,
        Accept: "application/json",
        ...(init.bytes ? { "Content-Type": "application/octet-stream" } : init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.bytes ? new Blob([init.bytes as BlobPart]) : init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeout ?? 15_000),
    });
    const json = (await res.json().catch(() => null)) as { status?: { code?: number; description?: string }; data?: unknown } | null;
    if (res.status === 401 && attempt === 0) continue; // the access token ran out early: refresh once
    const code = Number(json?.status?.code ?? res.status);
    if (!res.ok || code >= 400) {
      const d = json?.data as { moreInfo?: string; errorCode?: string } | undefined;
      throw new ZohoError(`Zoho Mail: ${d?.moreInfo || d?.errorCode || json?.status?.description || `error ${res.status}`}`, res.status === 401 ? "auth" : "api");
    }
    return json?.data as T;
  }
}

async function connected() {
  const conn = await getConnection();
  if (!conn) throw new ZohoError("Zoho Mail is not connected.", "auth");
  return conn;
}

/* ---------------- mail ---------------- */

type RawAddress = { mailId?: string; isAlias?: boolean; isPrimary?: boolean; isConfirmed?: boolean };
type RawAccount = {
  accountId?: string | number;
  type?: string;
  primaryEmailAddress?: string;
  displayName?: string;
  accountDisplayName?: string;
  zuid?: string | number;
  role?: string;
  enabled?: boolean;
  emailAddress?: RawAddress[];
  sendMailDetails?: { fromAddress?: string }[];
};

export type MailAccount = { accountId: string; email: string; name: string; from: string[] };
export type MailFolder = { folderId: string; name: string; type: string };
export type MailItem = { messageId: string; folderId: string; subject: string; summary: string; from: string; sender: string; to: string; time: number; unread: boolean; attachment: boolean };
export type MailDetails = { subject: string; from: string; sender: string; to: string; cc: string; time: number };

const str = (v: unknown) => (v == null ? "" : String(v));
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

export async function listAccounts(): Promise<MailAccount[]> {
  const accounts = await call<RawAccount[]>(await connected(), "/api/accounts");
  return accounts
    .filter((a) => a.accountId != null && a.type !== "IMAP_ACCOUNT" && a.type !== "POP_ACCOUNT")
    .map((a) => {
      const from = [a.primaryEmailAddress, ...(a.emailAddress ?? []).filter((e) => e.isConfirmed !== false).map((e) => e.mailId), ...(a.sendMailDetails ?? []).map((s) => s.fromAddress)];
      return {
        accountId: str(a.accountId),
        email: str(a.primaryEmailAddress),
        name: str(a.displayName || a.accountDisplayName),
        from: [...new Set(from.filter((x): x is string => !!x).map((x) => x.toLowerCase()))],
      };
    });
}

export async function listFolders(accountId: string): Promise<MailFolder[]> {
  const folders = await call<{ folderId?: string | number; folderName?: string; folderType?: string }[]>(await connected(), `/api/accounts/${enc(accountId)}/folders`);
  return folders.map((f) => ({ folderId: str(f.folderId), name: str(f.folderName), type: str(f.folderType) }));
}

type RawMessage = {
  messageId?: string | number;
  folderId?: string | number;
  subject?: string;
  summary?: string;
  fromAddress?: string;
  sender?: string;
  toAddress?: string;
  ccAddress?: string;
  receivedTime?: string | number;
  sentDateInGMT?: string | number;
  status?: string | number;
  hasAttachment?: string | boolean;
};

export async function listMessages(accountId: string, folderId: string, start: number, limit: number): Promise<MailItem[]> {
  const q = new URLSearchParams({ folderId, start: String(start), limit: String(limit), includeto: "true" });
  const list = await call<RawMessage[]>(await connected(), `/api/accounts/${enc(accountId)}/messages/view?${q}`);
  return (list ?? []).map((m) => ({
    messageId: str(m.messageId),
    folderId: str(m.folderId || folderId),
    subject: decode(str(m.subject)),
    summary: decode(str(m.summary)),
    from: decode(str(m.fromAddress)),
    sender: decode(str(m.sender)),
    to: decode(str(m.toAddress)),
    time: Number(m.receivedTime || m.sentDateInGMT || 0),
    unread: str(m.status) === "0",
    attachment: m.hasAttachment === true || str(m.hasAttachment) === "1" || str(m.hasAttachment) === "true",
  }));
}

export async function messageDetails(accountId: string, folderId: string, messageId: string): Promise<MailDetails> {
  const m = await call<RawMessage>(await connected(), `/api/accounts/${enc(accountId)}/folders/${enc(folderId)}/messages/${enc(messageId)}/details`);
  return {
    subject: decode(str(m?.subject)),
    from: decode(str(m?.fromAddress)),
    sender: decode(str(m?.sender)),
    to: decode(str(m?.toAddress)),
    cc: decode(str(m?.ccAddress)),
    time: Number(m?.receivedTime || m?.sentDateInGMT || 0),
  };
}

export async function messageContent(accountId: string, folderId: string, messageId: string) {
  const d = await call<{ content?: string }>(await connected(), `/api/accounts/${enc(accountId)}/folders/${enc(folderId)}/messages/${enc(messageId)}/content?includeBlockContent=true`);
  return str(d?.content);
}

export async function markRead(accountId: string, messageId: string) {
  await call(await connected(), `/api/accounts/${enc(accountId)}/updatemessage`, { method: "PUT", body: { mode: "markAsRead", messageId: [messageId] } });
}

/** Gmail's Delete: Zoho moves the mail to Trash; with `forever` it is deleted for good (expunge). One mail per call. */
export async function deleteMessage(accountId: string, folderId: string, messageId: string, forever = false) {
  const q = forever ? "?expunge=true" : "";
  await call(await connected(), `/api/accounts/${enc(accountId)}/folders/${enc(folderId)}/messages/${enc(messageId)}${q}`, { method: "DELETE" });
}

/** Moves mails to another folder, e.g. back to the Inbox from Trash or Spam. */
export async function moveMessages(accountId: string, messageIds: string[], destFolderId: string) {
  await call(await connected(), `/api/accounts/${enc(accountId)}/updatemessage`, { method: "PUT", body: { mode: "moveMessage", messageId: messageIds, destfolderId: destFolderId } });
}

/** A file already uploaded to Zoho's file store, ready to go with a mail. */
export type AttachmentRef = { storeName: string; attachmentPath: string; attachmentName: string };
export type Outgoing = { from: string; to: string; cc?: string; bcc?: string; subject: string; html: string; attachments?: AttachmentRef[] };

const outgoing = (m: Outgoing) => ({
  fromAddress: m.from,
  toAddress: m.to,
  ccAddress: m.cc || undefined,
  bccAddress: m.bcc || undefined,
  subject: m.subject,
  content: m.html,
  mailFormat: "html",
});

export async function sendMessage(accountId: string, m: Outgoing) {
  await call(await connected(), `/api/accounts/${enc(accountId)}/messages`, {
    method: "POST",
    body: { ...outgoing(m), attachments: m.attachments?.length ? m.attachments : undefined },
    timeout: 30_000,
  });
}

/** Zoho's reply call takes no attachments, so a reply with files is sent as a new mail (see app/admin/mail-actions.ts). */
export async function replyMessage(accountId: string, messageId: string, m: Outgoing) {
  await call(await connected(), `/api/accounts/${enc(accountId)}/messages/${enc(messageId)}`, { method: "POST", body: { action: "reply", ...outgoing(m) } });
}

/** Uploads one file to Zoho's file store of this mailbox (https://www.zoho.com/mail/help/api/post-upload-attachments.html). */
export async function uploadAttachment(accountId: string, fileName: string, bytes: Uint8Array): Promise<AttachmentRef & { size: number }> {
  const d = await call<{ storeName?: string; attachmentPath?: string; attachmentName?: string; attachmentSize?: string | number } | { storeName?: string; attachmentPath?: string; attachmentName?: string; attachmentSize?: string | number }[]>(
    await connected(),
    `/api/accounts/${enc(accountId)}/messages/attachments?${new URLSearchParams({ fileName })}`,
    { method: "POST", bytes, timeout: 60_000 },
  );
  const a = Array.isArray(d) ? d[0] : d;
  if (!a?.storeName || !a.attachmentPath) throw new ZohoError("Zoho did not accept the file.");
  return { storeName: a.storeName, attachmentPath: a.attachmentPath, attachmentName: a.attachmentName || fileName, size: Number(a.attachmentSize ?? bytes.length) };
}

export type MailFile = { attachmentId: string; name: string; size: number };

export async function attachmentInfo(accountId: string, folderId: string, messageId: string): Promise<MailFile[]> {
  const d = await call<{ attachments?: { attachmentId?: string | number; attachmentName?: string; attachmentSize?: string | number }[] }>(
    await connected(),
    `/api/accounts/${enc(accountId)}/folders/${enc(folderId)}/messages/${enc(messageId)}/attachmentinfo`,
  );
  return (d?.attachments ?? []).map((a) => ({ attachmentId: str(a.attachmentId), name: decode(str(a.attachmentName)) || "attachment", size: Number(a.attachmentSize ?? 0) }));
}

/** The file of a received mail, as Zoho streams it. */
export async function downloadAttachment(accountId: string, folderId: string, messageId: string, attachmentId: string) {
  const conn = await connected();
  const path = `/api/accounts/${enc(accountId)}/folders/${enc(folderId)}/messages/${enc(messageId)}/attachments/${enc(attachmentId)}`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${conn.mailApi}${path}`, {
      headers: { Authorization: `Zoho-oauthtoken ${await accessToken(conn, attempt > 0)}`, Accept: "application/octet-stream" },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status === 401 && attempt === 0) continue;
    if (!res.ok || !res.body) throw new ZohoError(`Zoho Mail: the file could not be downloaded (error ${res.status}).`, res.status === 401 ? "auth" : "api");
    return res;
  }
}

/* ---------------- addresses (organisation users and aliases) ---------------- */

export type MailUser = { zuid: string; email: string; name: string; role: string; aliases: string[]; enabled: boolean };

async function orgId() {
  const conn = await connected();
  const zoid = process.env.ZOHO_ORG_ID?.trim() || conn.zoid;
  if (!zoid) throw new ZohoError("Zoho did not give the organisation ID. Copy it from mailadmin.zoho.com › Organization (Organization Info) into Vercel as ZOHO_ORG_ID, then redeploy.");
  return { conn, zoid };
}

export async function listUsers(): Promise<MailUser[]> {
  const { conn, zoid } = await orgId();
  const users = await call<RawAccount[]>(conn, `/api/organization/${enc(zoid)}/accounts`);
  return (users ?? []).map((u) => ({
    zuid: str(u.zuid),
    email: str(u.primaryEmailAddress).toLowerCase(),
    name: str(u.displayName || u.accountDisplayName),
    role: str(u.role),
    aliases: (u.emailAddress ?? []).filter((e) => e.isAlias && e.mailId).map((e) => str(e.mailId).toLowerCase()),
    enabled: u.enabled !== false,
  }));
}

export async function addAlias(zuid: string, alias: string) {
  const { conn, zoid } = await orgId();
  await call(conn, `/api/organization/${enc(zoid)}/accounts/${enc(zuid)}`, { method: "PUT", body: { zuid: Number(zuid) || zuid, mode: "addEmailAlias", emailAlias: [alias] } });
}

export async function addUser(u: { email: string; password: string; firstName: string; lastName: string }) {
  const { conn, zoid } = await orgId();
  await call(conn, `/api/organization/${enc(zoid)}/accounts`, {
    method: "POST",
    body: {
      primaryEmailAddress: u.email,
      password: u.password,
      firstName: u.firstName || undefined,
      lastName: u.lastName || undefined,
      displayName: [u.firstName, u.lastName].filter(Boolean).join(" ") || undefined,
      role: "member",
      oneTimePassword: true,
    },
  });
}

const enc = encodeURIComponent;
