import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getConnection, listAccounts, markRead, messageContent, messageDetails } from "@/lib/zoho/mail";
import { firstAddress, MailError, MailFrame, mailDate, people } from "@/components/admin/MailFrame";
import { MailCompose } from "@/components/admin/MailClient";

type SP = Record<string, string | string[] | undefined>;
const num = (v: string | string[] | undefined) => (typeof v === "string" && /^\d{1,30}$/.test(v) ? v : "");

export default async function MailRead({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("mail.manage");
  const sp = await searchParams;
  return (
    <MailFrame active="inbox">
      <Message account={num(sp.account)} folder={num(sp.folder)} id={num(sp.id)} />
    </MailFrame>
  );
}

/**
 * The mail's own HTML runs in a sandboxed frame: no scripts, no forms, no access to Admin; links open in a new tab.
 */
const frame = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: cid:; style-src 'unsafe-inline' https:; font-src https: data:"><meta name="referrer" content="no-referrer"><base target="_blank"><style>body{margin:16px;font:14px/1.5 Arial,sans-serif;color:#0d1726;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;

async function Message({ account, folder, id }: { account: string; folder: string; id: string }) {
  if (!account || !folder || !id) return <div className="a-alert a-alert--err">This message link is incomplete.</div>;
  try {
    const [accounts, details, html, conn] = await Promise.all([listAccounts(), messageDetails(account, folder, id), messageContent(account, folder, id), getConnection()]);
    await markRead(account, id).catch(() => undefined);
    const owner = accounts.find((a) => a.accountId === account);
    const fromOptions = owner?.from ?? [];
    const received = `${details.to},${details.cc}`.toLowerCase();
    const replyFrom = fromOptions.find((f) => received.includes(f)) ?? fromOptions[0] ?? "";
    const subject = /^(re|ref|rép|رد)\s*:/i.test(details.subject) ? details.subject : `Re: ${details.subject}`;
    const zohoWeb = conn?.mailApi.startsWith("https://mail.") ? conn.mailApi : "https://mail.zoho.com";
    return (
      <>
        <div className="a-actions" style={{ marginBottom: 12 }}>
          <Link className="a-btn a-btn--sm" href={`/admin/mail?folder=${folder}`}>
            ← Back
          </Link>
          <a className="a-btn a-btn--sm a-btn--ghost" href={zohoWeb} target="_blank" rel="noreferrer">
            Open Zoho Mail (attachments, forwarding)
          </a>
        </div>
        <article className="a-card mail-view">
          <h2 dir="auto">{details.subject || "(no subject)"}</h2>
          <dl className="mail-head">
            <dt>From</dt>
            <dd dir="auto">
              {details.sender && details.sender !== details.from ? `${details.sender} · ` : ""}
              {firstAddress(details.from) || details.from}
            </dd>
            <dt>To</dt>
            <dd dir="auto">{people(details.to)}</dd>
            {details.cc && (
              <>
                <dt>Cc</dt>
                <dd dir="auto">{people(details.cc)}</dd>
              </>
            )}
            <dt>Date</dt>
            <dd className="mono">{mailDate(details.time)}</dd>
          </dl>
          <iframe className="mail-body" title="Message" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={frame(html)} />
        </article>
        <div style={{ marginTop: 16 }}>
          <MailCompose replyTo={id} fromOptions={fromOptions} initial={{ from: replyFrom, to: firstAddress(details.from), subject }} />
        </div>
      </>
    );
  } catch (e) {
    return <MailError error={e} />;
  }
}
