import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listMessages } from "@/lib/zoho/mail";
import { folderHref, listDate, MailError, MailFrame, one, people, type Mailbox, type SP } from "@/components/admin/MailFrame";
import { Avatar, MailIcon } from "@/components/admin/MailIcons";

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
  const first = (page - 1) * PAGE + 1;
  const shown = list.slice(0, PAGE);
  return (
    <section className="mx-card">
      <div className="mx-toolbar">
        <h2>{folder.name}</h2>
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
      </div>
      {shown.length === 0 ? (
        <div className="mx-empty">
          <MailIcon name="inbox" size={40} />
          <p>No mail in {folder.name}.</p>
        </div>
      ) : (
        <ul className="mx-list">
          {shown.map((m) => {
            const who = sent ? people(m.to) || m.to : m.sender || m.from;
            return (
              <li key={m.messageId}>
                <Link
                  className={`mx-row${m.unread ? " is-unread" : ""}`}
                  href={`/admin/mail/read?${new URLSearchParams({ account: box.account.accountId, folder: m.folderId, id: m.messageId })}`}
                >
                  <Avatar name={who} />
                  <span className="mx-row__who" dir="auto">
                    {sent && <small>To: </small>}
                    {who}
                  </span>
                  <span className="mx-row__text">
                    <b dir="auto">{m.subject || "(no subject)"}</b>
                    <span dir="auto">{m.summary}</span>
                  </span>
                  <span className="mx-row__meta">
                    {m.attachment && <MailIcon name="clip" size={15} />}
                    <time>{listDate(m.time)}</time>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
