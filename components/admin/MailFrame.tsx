import "server-only";
import Link from "next/link";
import { getConnection, listAccounts, listFolders, redirectUri, ZohoError, zohoConfig, type MailAccount, type MailFolder, type ZohoConnection } from "@/lib/zoho/mail";
import { siteUrl } from "@/lib/seo";
import { DisconnectMail } from "./MailClient";
import { ComposeButton, ComposeProvider } from "./MailCompose";
import { folderIcon, MailIcon } from "./MailIcons";

export type SP = Record<string, string | string[] | undefined>;
export const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** What every connected Mail page knows: the mailbox shown (and the others of this sign-in) and its folders. */
export type Mailbox = { conn: ZohoConnection; accounts: MailAccount[]; account: MailAccount; folders: MailFolder[] };

const NOTICES: Record<string, string> = {
  state: "The Zoho sign-in expired or was started in another tab. Press Connect Zoho Mail again.",
  setup: "ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are not set in Vercel yet.",
  server: "Zoho answered from a sign-in server this site does not recognise, so the connection was not saved.",
  access_denied: "Access was not allowed on Zoho's page, so nothing was connected.",
};

/** The query string Zoho's callback leaves on /admin/mail (?connected=1 or ?error=…), as a message. */
function MailNotice({ sp }: { sp: SP }) {
  const error = one(sp.error);
  if (error) return <div className="a-alert a-alert--err">{NOTICES[error] ?? error}</div>;
  if (sp.connected) return <div className="a-alert a-alert--info">Zoho Mail is connected.</div>;
  return null;
}

/** Zoho errors as a readable box; a lost sign-in also says how to fix it. */
export function MailError({ error }: { error: unknown }) {
  const text = error instanceof Error ? error.message : String(error);
  return (
    <div className="a-alert a-alert--err">
      {text}
      {error instanceof ZohoError && error.kind === "auth" && <> Disconnect, then connect Zoho Mail again.</>}
      {/not.*(allowed|permitted|plan|licen)|upgrade/i.test(text) && <> Zoho may need a paid plan for this (Zoho Mail Admin › Subscription).</>}
    </div>
  );
}

/** Link to a folder of the mailbox shown, keeping the mailbox when this sign-in has several. */
export const folderHref = (box: Mailbox, folderId: string, extra: Record<string, string | number> = {}) =>
  `/admin/mail?${new URLSearchParams({
    ...(box.accounts.length > 1 ? { account: box.account.accountId } : {}),
    folder: folderId,
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, String(v)])),
  })}`;

/**
 * The Mail app around every Admin › Mail page: the dark GOODMAX header, the setup or connect step, then the folder rail
 * with "+ New message" and the page itself. `active` is the open folder id, or "addresses".
 */
export async function MailFrame({ sp, active, children }: { sp: SP; active?: string; children: (box: Mailbox) => React.ReactNode }) {
  const configured = !!zohoConfig();
  let conn: ZohoConnection | null = null;
  let failed: unknown = null;
  let box: Mailbox | null = null;
  if (configured) {
    try {
      conn = await getConnection();
      if (conn) {
        const accounts = await listAccounts();
        const account = accounts.find((a) => a.accountId === one(sp.account)) ?? accounts[0];
        if (!account) throw new ZohoError("Zoho returned no mailbox for this sign-in.");
        box = { conn, accounts, account, folders: await listFolders(account.accountId) };
      }
    } catch (e) {
      failed = e;
    }
  }
  const current = active ?? box?.folders.find((f) => /inbox/i.test(f.type))?.folderId;
  const compose = one(sp.compose) === "1" ? { to: one(sp.to).slice(0, 300) } : null;
  const head = (
    <header className="mx-hero">
      <div>
        <span className="mx-eyebrow">Company mail</span>
        <h1>Mail</h1>
        <p>{box ? box.account.email : "The @goodmaxdz.com mailboxes, hosted by Zoho Mail."}</p>
      </div>
      {conn && <DisconnectMail />}
    </header>
  );
  if (!box)
    return (
      <div className="mx">
        {head}
        <MailNotice sp={sp} />
        {failed ? <MailError error={failed} /> : !configured ? <SetupSteps /> : <ConnectStep />}
      </div>
    );
  const fromOptions = [...new Set(box.accounts.flatMap((a) => a.from))];
  return (
    <ComposeProvider fromOptions={fromOptions} start={compose}>
      <div className="mx">
        {head}
        <MailNotice sp={sp} />
        <div className="mx-app">
          <aside className="mx-rail">
            <ComposeButton variant="rail" />
            {box.accounts.length > 1 && (
              <nav className="mx-boxes" aria-label="Mailboxes">
                {box.accounts.map((a) => (
                  <Link key={a.accountId} href={`/admin/mail?account=${a.accountId}`} aria-current={a.accountId === box.account.accountId ? "page" : undefined}>
                    {a.email}
                  </Link>
                ))}
              </nav>
            )}
            <nav className="mx-folders" aria-label="Folders">
              {box.folders.map((f) => (
                <Link key={f.folderId} href={folderHref(box, f.folderId)} aria-current={f.folderId === current ? "page" : undefined}>
                  <MailIcon name={folderIcon(f.type || f.name)} />
                  <span>{f.name}</span>
                </Link>
              ))}
              <hr />
              <Link href="/admin/mail/addresses" aria-current={active === "addresses" ? "page" : undefined}>
                <MailIcon name="at" />
                <span>Addresses</span>
              </Link>
              <a href={box.conn.mailApi.startsWith("https://mail.") ? box.conn.mailApi : "https://mail.zoho.com"} target="_blank" rel="noreferrer">
                <MailIcon name="external" />
                <span>Open Zoho Mail</span>
              </a>
            </nav>
          </aside>
          <main className="mx-main">{children(box)}</main>
        </div>
        <ComposeButton variant="fab" />
      </div>
    </ComposeProvider>
  );
}

function ConnectStep() {
  return (
    <div className="mx-card mx-card--pad">
      <h2>Connect Zoho Mail</h2>
      <p>
        Sign in on Zoho&apos;s page with the mailbox to read here (for example admin@goodmaxdz.com) and allow access. To add addresses and mailboxes, it must be an
        administrator of the Zoho organisation. The password stays with Zoho; the site keeps only an encrypted access key.
      </p>
      {/* a full page load: the route sends the browser on to Zoho */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a className="mx-send" href="/api/admin/zoho/connect">
        Connect Zoho Mail
      </a>
    </div>
  );
}

function SetupSteps() {
  return (
    <div className="mx-card mx-card--pad">
      <h2>Set up Zoho Mail (once)</h2>
      <ol className="mail-steps">
        <li>
          Open <a href="https://api-console.zoho.com" target="_blank" rel="noreferrer">api-console.zoho.com</a> with the Zoho Mail administrator account, press
          Add Client and choose <b>Server-based Applications</b>.
        </li>
        <li>
          Client name: <code>GOODMAX website</code>. Homepage URL: <code>{siteUrl()}</code>. Authorized Redirect URIs: <code>{redirectUri()}</code>
        </li>
        <li>
          Zoho shows a Client ID and a Client Secret. In Vercel › goodmax › Settings › Environment Variables, add them as <code>ZOHO_CLIENT_ID</code> and{" "}
          <code>ZOHO_CLIENT_SECRET</code>, then redeploy. Never send them by chat or email.
        </li>
        <li>Come back to this page and press Connect Zoho Mail.</li>
      </ol>
      <p className="muted">Zoho&apos;s free plan may not allow this kind of access; if Zoho refuses, this page shows its message.</p>
    </div>
  );
}

const TZ = "Africa/Algiers";
const full = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
const time = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
const short = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "2-digit" });
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

export const mailDate = (ms: number) => (ms ? full.format(new Date(ms)) : "");

/** Gmail-style list date: the time for today, "25 Oct" this year, 25/10/24 before. */
export function listDate(ms: number) {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  if (ymd(d) === ymd(now)) return time.format(d);
  if (ymd(d).slice(0, 4) === ymd(now).slice(0, 4)) return dayMonth.format(d);
  return short.format(d);
}

/** `"Sara" <sara@x.dz>, ali@y.dz` → `Sara, ali@y.dz` */
export const people = (list: string) =>
  list
    .split(",")
    .map((p) => p.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/)?.slice(1).find((x) => x.trim()) ?? p.trim())
    .filter(Boolean)
    .join(", ");

/** The first email address in a header such as `"Sara" <sara@x.dz>`. */
export const firstAddress = (s: string) => s.match(/[^\s<>",;:]+@[^\s<>",;:]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() ?? "";
