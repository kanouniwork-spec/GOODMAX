import "server-only";
import Link from "next/link";
import { getConnection, redirectUri, ZohoError, zohoConfig } from "@/lib/zoho/mail";
import { siteUrl } from "@/lib/seo";
import { DisconnectMail } from "./MailClient";

const TABS = [
  { key: "inbox", href: "/admin/mail", label: "Inbox" },
  { key: "write", href: "/admin/mail/write", label: "Write" },
  { key: "addresses", href: "/admin/mail/addresses", label: "Addresses" },
] as const;

const NOTICES: Record<string, string> = {
  state: "The Zoho sign-in expired or was started in another tab. Press Connect Zoho Mail again.",
  setup: "ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are not set in Vercel yet.",
  server: "Zoho answered from a sign-in server this site does not recognise, so the connection was not saved.",
  access_denied: "Access was not allowed on Zoho's page, so nothing was connected.",
};

/** The query string Zoho's callback leaves on /admin/mail (?connected=1 or ?error=…), as a message. */
export function MailNotice({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const error = typeof sp.error === "string" ? sp.error : "";
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

/** Header, tabs and the setup or connect step that every Admin › Mail page shares. */
export async function MailFrame({ active, notice, children }: { active: (typeof TABS)[number]["key"]; notice?: React.ReactNode; children: React.ReactNode }) {
  const configured = !!zohoConfig();
  let conn: Awaited<ReturnType<typeof getConnection>> = null;
  let failed: unknown = null;
  if (configured) conn = await getConnection().catch((e) => ((failed = e), null));
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Mail</h1>
          <p>The company mailboxes, hosted by Zoho Mail: read and answer mail, write new mail and add company addresses.</p>
        </div>
        {conn && (
          <div className="a-actions">
            <span className="muted">
              Connected as <b>{conn.email || "Zoho Mail"}</b>
            </span>
            <DisconnectMail />
          </div>
        )}
      </div>
      {notice}
      {failed ? (
        <MailError error={failed} />
      ) : !configured ? (
        <SetupSteps />
      ) : !conn ? (
        <div className="a-card">
          <h2>Connect Zoho Mail</h2>
          <p style={{ marginTop: 0 }}>
            Sign in on Zoho&apos;s page with the mailbox to read here (for example admin@goodmaxdz.com) and allow access. To add addresses and mailboxes, it must be an
            administrator of the Zoho organisation. The password stays with Zoho; the site keeps only an encrypted access key.
          </p>
          {/* a full page load: the route sends the browser on to Zoho */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="a-btn a-btn--primary" href="/api/admin/zoho/connect">
            Connect Zoho Mail
          </a>
        </div>
      ) : (
        <>
          <nav className="a-tabs" aria-label="Mail">
            {TABS.map((t) => (
              <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}>
                {t.label}
              </Link>
            ))}
          </nav>
          {children}
        </>
      )}
    </>
  );
}

function SetupSteps() {
  return (
    <div className="a-card">
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
      <p className="muted" style={{ marginBottom: 0 }}>
        Zoho&apos;s free plan may not allow this kind of access; if Zoho refuses, this page shows its message.
      </p>
    </div>
  );
}

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Algiers", dateStyle: "medium", timeStyle: "short" });
export const mailDate = (ms: number) => (ms ? fmt.format(new Date(ms)) : "");

/** `"Sara" <sara@x.dz>, ali@y.dz` → `Sara, ali@y.dz` */
export const people = (list: string) =>
  list
    .split(",")
    .map((p) => p.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/)?.slice(1).find((x) => x.trim()) ?? p.trim())
    .filter(Boolean)
    .join(", ");

/** The first email address in a header such as `"Sara" <sara@x.dz>`. */
export const firstAddress = (s: string) => s.match(/[^\s<>",;:]+@[^\s<>",;:]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() ?? "";
