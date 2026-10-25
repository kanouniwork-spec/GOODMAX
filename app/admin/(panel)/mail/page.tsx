import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listAccounts, listFolders, listMessages } from "@/lib/zoho/mail";
import { MailError, MailFrame, MailNotice, mailDate, people } from "@/components/admin/MailFrame";

type SP = Record<string, string | string[] | undefined>;
const PAGE = 25;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function MailInbox({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("mail.manage");
  const sp = await searchParams;
  return (
    <MailFrame active="inbox" notice={<MailNotice sp={sp} />}>
      <Inbox sp={sp} />
    </MailFrame>
  );
}

async function Inbox({ sp }: { sp: SP }) {
  try {
    const accounts = await listAccounts();
    const account = accounts.find((a) => a.accountId === one(sp.account)) ?? accounts[0];
    if (!account) return <div className="a-alert">Zoho returned no mailbox for this sign-in.</div>;
    const folders = await listFolders(account.accountId);
    const folder = folders.find((f) => f.folderId === one(sp.folder)) ?? folders.find((f) => f.type.toLowerCase() === "inbox") ?? folders[0];
    if (!folder) return <div className="a-alert">This mailbox has no folders yet.</div>;
    const page = Math.max(1, Math.min(400, Number(one(sp.page)) || 1));
    const list = await listMessages(account.accountId, folder.folderId, (page - 1) * PAGE + 1, PAGE + 1);
    const sent = /sent|outbox|draft/i.test(folder.type);
    const link = (q: Record<string, string | number>) =>
      `/admin/mail?${new URLSearchParams({ ...(accounts.length > 1 ? { account: account.accountId } : {}), folder: folder.folderId, ...Object.fromEntries(Object.entries(q).map(([k, v]) => [k, String(v)])) })}`;
    return (
      <>
        {accounts.length > 1 && (
          <nav className="mail-folders" aria-label="Mailboxes">
            {accounts.map((a) => (
              <Link key={a.accountId} href={`/admin/mail?account=${a.accountId}`} aria-current={a.accountId === account.accountId ? "page" : undefined}>
                {a.email}
              </Link>
            ))}
          </nav>
        )}
        <nav className="mail-folders" aria-label="Folders">
          {folders.map((f) => (
            <Link key={f.folderId} href={link({ folder: f.folderId })} aria-current={f.folderId === folder.folderId ? "page" : undefined}>
              {f.name}
            </Link>
          ))}
        </nav>
        <div className="mail-list">
          {list.length === 0 && <p className="muted">No mail in {folder.name}.</p>}
          {list.slice(0, PAGE).map((m) => (
            <Link
              key={m.messageId}
              className={`mail-row${m.unread ? " mail-row--unread" : ""}`}
              href={`/admin/mail/read?${new URLSearchParams({ account: account.accountId, folder: m.folderId, id: m.messageId })}`}
            >
              <span className="mail-row__who" dir="auto">
                {sent ? `To: ${people(m.to)}` : m.sender || m.from}
              </span>
              <span className="mail-row__text">
                <b dir="auto">{m.subject || "(no subject)"}</b>
                <span className="muted" dir="auto">
                  {m.summary}
                </span>
              </span>
              <span className="mail-row__when mono">
                {m.attachment && <span aria-label="Has attachments">📎 </span>}
                {mailDate(m.time)}
              </span>
            </Link>
          ))}
        </div>
        {(page > 1 || list.length > PAGE) && (
          <div className="a-actions" style={{ marginTop: 14 }}>
            {page > 1 && (
              <Link className="a-btn a-btn--sm" href={link({ page: page - 1 })}>
                ← Newer
              </Link>
            )}
            <span className="muted">Page {page}</span>
            {list.length > PAGE && (
              <Link className="a-btn a-btn--sm" href={link({ page: page + 1 })}>
                Older →
              </Link>
            )}
          </div>
        )}
      </>
    );
  } catch (e) {
    return <MailError error={e} />;
  }
}
