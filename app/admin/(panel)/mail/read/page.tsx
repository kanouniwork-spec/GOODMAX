import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { attachmentInfo, markRead, messageContent, messageDetails, type MailFile } from "@/lib/zoho/mail";
import { firstAddress, folderHref, MailError, MailFrame, mailDate, people, type Mailbox, type SP } from "@/components/admin/MailFrame";
import { ReplyBox } from "@/components/admin/MailCompose";
import { MailBody } from "@/components/admin/MailClient";
import { Avatar, MailIcon } from "@/components/admin/MailIcons";

const num = (v: string | string[] | undefined) => (typeof v === "string" && /^\d{1,30}$/.test(v) ? v : "");

export default async function MailRead({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("mail.manage");
  const sp = await searchParams;
  const folder = num(sp.folder);
  return (
    <MailFrame sp={sp} active={folder || undefined}>
      {(box) => <Message box={box} account={num(sp.account)} folder={folder} id={num(sp.id)} />}
    </MailFrame>
  );
}

/**
 * The mail's own HTML for the sandboxed frame (MailBody): no scripts, no forms, links open in a new tab, and
 * javascript: links are taken out here as well as in the browser.
 */
const frame = (html: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; img-src https: data: cid:; style-src 'unsafe-inline' https:; font-src https: data:"><meta name="referrer" content="no-referrer"><base target="_blank"><style>body{margin:0;padding:4px 2px;font:15px/1.6 Arial,sans-serif;color:#0a1626;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${html.replace(/\b(href|src|action)\s*=\s*(["']?)\s*javascript:/gi, "$1=$2#")}</body></html>`;

async function Message({ box, account, folder, id }: { box: Mailbox; account: string; folder: string; id: string }) {
  if (!account || !folder || !id) return <div className="a-alert a-alert--err">This message link is incomplete.</div>;
  try {
    const [details, html, files] = await Promise.all([
      messageDetails(account, folder, id),
      messageContent(account, folder, id),
      attachmentInfo(account, folder, id).catch(() => [] as MailFile[]),
    ]);
    await markRead(account, id).catch(() => undefined);
    const owner = box.accounts.find((a) => a.accountId === account);
    const fromOptions = owner?.from ?? [];
    const received = `${details.to},${details.cc}`.toLowerCase();
    const replyFrom = fromOptions.find((f) => received.includes(f)) ?? fromOptions[0] ?? "";
    const subject = /^(re|ref|rép|رد)\s*:/i.test(details.subject) ? details.subject : `Re: ${details.subject}`;
    const sender = details.sender && details.sender !== details.from ? details.sender : "";
    const address = firstAddress(details.from) || details.from;
    const folderName = box.folders.find((f) => f.folderId === folder)?.name ?? "Inbox";
    return (
      <article className="mx-card mx-read">
        <div className="mx-toolbar">
          <Link className="mx-iconbtn" href={folderHref(box, folder)} title={`Back to ${folderName}`} aria-label={`Back to ${folderName}`}>
            <MailIcon name="left" />
          </Link>
          <span className="mx-toolbar__crumb">{folderName}</span>
        </div>
        <div className="mx-pad">
          <h2 className="mx-read__subject" dir="auto">
            {details.subject || "(no subject)"}
          </h2>
          <div className="mx-read__from">
            <Avatar name={sender || address} size={42} />
            <div>
              <b dir="auto">{sender || address}</b> {sender && <span className="muted">&lt;{address}&gt;</span>}
              <small dir="auto">
                to {people(details.to)}
                {details.cc && <> · cc {people(details.cc)}</>}
              </small>
            </div>
            <time>{mailDate(details.time)}</time>
          </div>
          {files.length > 0 && <Files files={files} q={{ account, folder, id }} />}
          <MailBody srcDoc={frame(html)} />
          <ReplyBox replyTo={id} fromOptions={fromOptions} initial={{ from: replyFrom, to: firstAddress(details.from), subject }} />
        </div>
      </article>
    );
  } catch (e) {
    return <MailError error={e} />;
  }
}

const PHOTO = /\.(jpe?g|png|gif|webp)$/i;
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function Files({ files, q }: { files: MailFile[]; q: { account: string; folder: string; id: string } }) {
  const href = (f: MailFile, view = false) =>
    `/api/admin/zoho/file?${new URLSearchParams({ ...q, att: f.attachmentId, name: f.name, ...(view ? { view: "1" } : {}) })}`;
  return (
    <ul className="mail-files mail-files--received" aria-label="Attachments">
      {files.map((f) => (
        <li key={f.attachmentId}>
          {PHOTO.test(f.name) ? (
            <a href={href(f, true)} target="_blank" rel="noreferrer" aria-label={`Open ${f.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={href(f, true)} alt="" loading="lazy" />
            </a>
          ) : (
            <span className="mail-files__icon">{f.name.split(".").pop()?.slice(0, 4).toUpperCase() || "FILE"}</span>
          )}
          <span className="mail-files__name" dir="auto">
            {f.name}
            <small>{f.size ? size(f.size) : ""}</small>
          </span>
          <a className="mx-iconbtn" href={href(f)} download={f.name} title={`Download ${f.name}`} aria-label={`Download ${f.name}`}>
            <MailIcon name="download" />
          </a>
        </li>
      ))}
    </ul>
  );
}
