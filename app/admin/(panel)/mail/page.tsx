import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listMessages } from "@/lib/zoho/mail";
import { folderHref, listDate, MailError, MailFrame, one, people, type Mailbox, type SP } from "@/components/admin/MailFrame";
import { MailIcon } from "@/components/admin/MailIcons";
import { MailList, type FolderKind, type MailRow } from "@/components/admin/MailList";

const PAGE = 25;

export default async function MailInbox({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("mail.manage");
  const sp = await searchParams;
  return (
    <MailFrame sp={sp} active={one(sp.folder) || undefined}>
      {(box) => <Inbox box={box} sp={sp} />}
    </MailFrame>
  );
}

async function Inbox({ box, sp }: { box: Mailbox; sp: SP }) {
  const folder = box.folders.find((f) => f.folderId === one(sp.folder)) ?? box.folders.find((f) => /inbox/i.test(f.type)) ?? box.folders[0];
  if (!folder) return <div className="a-alert">This mailbox has no folders yet.</div>;
  const page = Math.max(1, Math.min(400, Number(one(sp.page)) || 1));
  let list;
  try {
    list = await listMessages(box.account.accountId, folder.folderId, (page - 1) * PAGE + 1, PAGE + 1);
  } catch (e) {
    return <MailError error={e} />;
  }
  const sent = /sent|outbox|draft/i.test(folder.type);
  const kind: FolderKind = /trash/i.test(folder.type) ? "trash" : /spam/i.test(folder.type) ? "spam" : "mail";
  const first = (page - 1) * PAGE + 1;
  const shown = list.slice(0, PAGE);
  const rows: MailRow[] = shown.map((m) => ({
    id: m.messageId,
    href: `/admin/mail/read?${new URLSearchParams({ account: box.account.accountId, folder: m.folderId, id: m.messageId })}`,
    who: sent ? people(m.to) || m.to : m.sender || m.from,
    to: sent,
    subject: m.subject,
    summary: m.summary,
    unread: m.unread,
    attachment: m.attachment,
    date: listDate(m.time),
  }));
  const nav = (
    <>
      <Link className="mx-iconbtn" href={folderHref(box, folder.folderId, page > 1 ? { page } : {})} title="Refresh" aria-label="Refresh">
        <MailIcon name="refresh" />
      </Link>
      <span className="mx-toolbar__count">{shown.length ? `${first}–${first + shown.length - 1}` : "0"}</span>
      {page > 1 ? (
        <Link className="mx-iconbtn" href={folderHref(box, folder.folderId, { page: page - 1 })} title="Newer" aria-label="Newer">
          <MailIcon name="left" />
        </Link>
      ) : (
        <span className="mx-iconbtn" aria-disabled="true">
          <MailIcon name="left" />
        </span>
      )}
      {list.length > PAGE ? (
        <Link className="mx-iconbtn" href={folderHref(box, folder.folderId, { page: page + 1 })} title="Older" aria-label="Older">
          <MailIcon name="right" />
        </Link>
      ) : (
        <span className="mx-iconbtn" aria-disabled="true">
          <MailIcon name="right" />
        </span>
      )}
    </>
  );
  return (
    <MailList
      key={`${box.account.accountId}-${folder.folderId}-${page}`}
      accountId={box.account.accountId}
      folderId={folder.folderId}
      kind={kind}
      title={folder.name}
      nav={nav}
      rows={rows}
      empty={
        <div className="mx-empty">
          <MailIcon name={kind === "trash" ? "trash" : "inbox"} size={40} />
          <p>No mail in {folder.name}.</p>
        </div>
      }
    />
  );
}
