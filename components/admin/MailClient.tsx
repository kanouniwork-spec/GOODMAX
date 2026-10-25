"use client";

import { useEffect, useRef, useState } from "react";
import { addMailAlias, createMailbox, disconnectMail } from "@/app/admin/mail-actions";
import type { MailUser } from "@/lib/zoho/mail";
import { MailIcon } from "./MailIcons";
import { Confirm, useAct } from "./ui";

export function DisconnectMail() {
  const { run, pending } = useAct();
  return (
    <Confirm
      className="mx-pill mx-pill--dark"
      disabled={pending}
      message="Disconnect Zoho Mail? The mail stays in Zoho; Admin stops showing it until someone connects again."
      onConfirm={() => run(disconnectMail, "Zoho Mail disconnected")}
    >
      <MailIcon name="power" size={15} />
      Disconnect
    </Confirm>
  );
}

const SAFE_LINK = /^(https?|mailto|tel):$/;

/**
 * A received mail's HTML in a sandboxed frame that grows to the mail's height. Scripts, forms and plugins stay off
 * (no allow-scripts, and the frame's own CSP); same-origin only lets this page measure it and drop links that are not
 * web, mail or phone links. Links open in a new tab.
 */
export function MailBody({ srcDoc }: { srcDoc: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let watch: ResizeObserver | undefined;
    const fit = () => {
      const body = frame.contentDocument?.body;
      if (body) frame.style.height = `${Math.max(120, body.scrollHeight, body.offsetHeight) + 8}px`;
    };
    const ready = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      doc.querySelectorAll<HTMLAnchorElement | HTMLAreaElement>("a[href], area[href]").forEach((a) => SAFE_LINK.test(a.protocol) || a.removeAttribute("href"));
      fit();
      watch?.disconnect();
      if (typeof ResizeObserver !== "undefined") {
        watch = new ResizeObserver(fit);
        watch.observe(doc.body);
      }
    };
    frame.addEventListener("load", ready); // again once the mail's pictures have loaded
    // and as soon as the text is there, without waiting for pictures (up to 5 s of checks)
    let tries = 0;
    let timer = 0;
    const early = () => {
      const doc = frame.contentDocument;
      if (doc?.URL === "about:srcdoc" && doc.readyState !== "loading") ready();
      else if (tries++ < 100) timer = window.setTimeout(early, 50);
    };
    early();
    return () => {
      window.clearTimeout(timer);
      frame.removeEventListener("load", ready);
      watch?.disconnect();
    };
  }, [srcDoc]);
  return <iframe ref={ref} className="mx-read__body" title="Message" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={srcDoc} />;
}

/** Admin › Mail › Addresses: extra addresses for an existing mailbox, and new mailboxes. */
export function MailAddresses({ users, domain }: { users: MailUser[]; domain: string }) {
  const { run, pending } = useAct();
  const [alias, setAlias] = useState({ zuid: users[0]?.zuid ?? "", local: "" });
  const [box, setBox] = useState({ firstName: "", lastName: "", local: "", password: "" });
  const [note, setNote] = useState<{ alias?: string; box?: string }>({});
  return (
    <>
      <div className="a-table-wrap" style={{ marginBottom: 16 }}>
        <table className="a-table">
          <thead>
            <tr>
              <th>Mailbox</th>
              <th>Also receives</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  No mailboxes yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.zuid || u.email}>
                <td>
                  <b>{u.email}</b> {!u.enabled && <span className="badge badge--warn">disabled</span>}
                  <div className="muted">{u.name}</div>
                </td>
                <td>
                  <div className="mail-aliases">
                    {u.aliases.length ? u.aliases.map((a) => <span key={a} className="badge">{a}</span>) : <span className="muted">—</span>}
                  </div>
                </td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mail-forms">
        <form
          className="a-card"
          onSubmit={(e) => {
            e.preventDefault();
            const owner = users.find((u) => u.zuid === alias.zuid)?.email;
            run(
              () => addMailAlias(alias.zuid, alias.local),
              undefined,
              (address) => {
                setNote({ alias: `${address} now arrives in ${owner}.` });
                setAlias({ ...alias, local: "" });
              },
            );
          }}
        >
          <h2>Add an address to a mailbox</h2>
          <p className="muted">Mail sent to the new address arrives in the chosen mailbox, and that mailbox can send from it.</p>
          <div className="a-field">
            <label htmlFor="al-local">New address</label>
            <div className="mail-local">
              <input id="al-local" type="text" required value={alias.local} onChange={(e) => setAlias({ ...alias, local: e.target.value })} placeholder="contact" />
              <span>@{domain}</span>
            </div>
          </div>
          <div className="a-field">
            <label htmlFor="al-box">Arrives in</label>
            <select id="al-box" value={alias.zuid} onChange={(e) => setAlias({ ...alias, zuid: e.target.value })}>
              {users.map((u) => (
                <option key={u.zuid} value={u.zuid}>
                  {u.email}
                </option>
              ))}
            </select>
          </div>
          {note.alias && <div className="a-alert a-alert--info">{note.alias}</div>}
          <button className="a-btn a-btn--primary" disabled={pending || !users.length}>
            Add address
          </button>
        </form>
        <form
          className="a-card"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createMailbox(box),
              undefined,
              (address) => {
                setNote({ box: `Mailbox ${address} created. Its owner signs in at mail.zoho.com with the first password, then Zoho asks for a new one.` });
                setBox({ firstName: "", lastName: "", local: "", password: "" });
              },
            );
          }}
        >
          <h2>Create a mailbox for a person</h2>
          <p className="muted">
            A separate inbox with its own password, read at mail.zoho.com or in the Zoho Mail app. Each mailbox uses one of the organisation&apos;s Zoho user licences.
          </p>
          <div className="a-row">
            <div className="a-field">
              <label htmlFor="mb-first">First name</label>
              <input id="mb-first" type="text" required value={box.firstName} onChange={(e) => setBox({ ...box, firstName: e.target.value })} />
            </div>
            <div className="a-field">
              <label htmlFor="mb-last">Last name</label>
              <input id="mb-last" type="text" value={box.lastName} onChange={(e) => setBox({ ...box, lastName: e.target.value })} />
            </div>
          </div>
          <div className="a-field">
            <label htmlFor="mb-local">Address</label>
            <div className="mail-local">
              <input id="mb-local" type="text" required value={box.local} onChange={(e) => setBox({ ...box, local: e.target.value })} placeholder="sales" />
              <span>@{domain}</span>
            </div>
          </div>
          <div className="a-field">
            <label htmlFor="mb-pw">First password (10+ characters)</label>
            <input id="mb-pw" type="password" autoComplete="new-password" required minLength={10} value={box.password} onChange={(e) => setBox({ ...box, password: e.target.value })} />
            <small>Give it to the person face to face or by phone. Zoho asks them to change it at the first sign-in.</small>
          </div>
          {note.box && <div className="a-alert a-alert--info">{note.box}</div>}
          <button className="a-btn a-btn--primary" disabled={pending}>
            Create mailbox
          </button>
        </form>
      </div>
    </>
  );
}
