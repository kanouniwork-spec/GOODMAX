"use client";

import { useState } from "react";
import { addMailAlias, createMailbox, disconnectMail, replyMail, sendMail } from "@/app/admin/mail-actions";
import type { MailUser } from "@/lib/zoho/mail";
import { Confirm, useAct } from "./ui";

export function DisconnectMail() {
  const { run, pending } = useAct();
  return (
    <Confirm
      className="a-btn a-btn--sm"
      disabled={pending}
      message="Disconnect Zoho Mail? The mail stays in Zoho; Admin stops showing it until someone connects again."
      onConfirm={() => run(disconnectMail, "Zoho Mail disconnected")}
    >
      Disconnect
    </Confirm>
  );
}

type Draft = { from: string; to: string; cc: string; bcc: string; subject: string; body: string };

/** New mail (Write tab) or a reply under an open message. Plain text, sent as simple HTML. */
export function MailCompose({ fromOptions, initial, replyTo }: { fromOptions: string[]; initial: Partial<Draft>; replyTo?: string }) {
  const { run, pending } = useAct();
  const blank: Draft = { from: fromOptions[0] ?? "", to: "", cc: "", bcc: "", subject: "", body: "" };
  const [d, setD] = useState<Draft>({ ...blank, ...initial });
  const [copies, setCopies] = useState(!!(initial.cc || initial.bcc));
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setD({ ...d, [k]: e.target.value });
  const id = replyTo ? "r" : "w";
  return (
    <form
      className="a-card mail-compose"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => (replyTo ? replyMail(replyTo, d) : sendMail(d)), replyTo ? "Reply sent" : "Mail sent", () =>
          setD(replyTo ? { ...d, body: "" } : { ...blank, from: d.from }),
        );
      }}
    >
      <h2>{replyTo ? "Reply" : "New mail"}</h2>
      <div className="a-row">
        <div className="a-field">
          <label htmlFor={`${id}-from`}>From</label>
          <select id={`${id}-from`} value={d.from} onChange={set("from")}>
            {fromOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="a-field">
          <label htmlFor={`${id}-to`}>To</label>
          <input id={`${id}-to`} type="text" inputMode="email" required value={d.to} onChange={set("to")} placeholder="name@example.com, …" />
        </div>
      </div>
      {copies ? (
        <div className="a-row">
          <div className="a-field">
            <label htmlFor={`${id}-cc`}>Cc</label>
            <input id={`${id}-cc`} type="text" inputMode="email" value={d.cc} onChange={set("cc")} />
          </div>
          <div className="a-field">
            <label htmlFor={`${id}-bcc`}>Bcc</label>
            <input id={`${id}-bcc`} type="text" inputMode="email" value={d.bcc} onChange={set("bcc")} />
          </div>
        </div>
      ) : (
        <button type="button" className="a-btn a-btn--sm a-btn--ghost" style={{ marginBottom: 12 }} onClick={() => setCopies(true)}>
          + Cc / Bcc
        </button>
      )}
      <div className="a-field">
        <label htmlFor={`${id}-subject`}>Subject</label>
        <input id={`${id}-subject`} type="text" dir="auto" maxLength={300} value={d.subject} onChange={set("subject")} />
      </div>
      <div className="a-field">
        <label htmlFor={`${id}-body`}>Message</label>
        <textarea id={`${id}-body`} dir="auto" rows={replyTo ? 7 : 12} required value={d.body} onChange={set("body")} />
      </div>
      <button className="a-btn a-btn--primary" disabled={pending}>
        {pending ? "Sending…" : replyTo ? "Send reply" : "Send"}
      </button>
    </form>
  );
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
