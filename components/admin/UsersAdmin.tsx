"use client";

import { useState } from "react";
import type { Profile, Role } from "@/types/content";
import { createUser, updateUser } from "@/app/admin/actions";
import { Modal, Switch, useAct } from "./ui";

export function UsersAdmin({ users, me, roles }: { users: Omit<Profile, "password_hash">[]; me: string; roles: Record<Role, string> }) {
  const { run, pending } = useAct();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "editor" as Role, password: "" });
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  return (
    <>
      <div className="a-top">
        <div>
          <h1>Users & Roles</h1>
          <p>Only admins can see this page.</p>
        </div>
        <button type="button" className="a-btn a-btn--primary" onClick={() => setAdding(true)}>
          + Add user
        </button>
      </div>
      <div className="a-card" style={{ marginBottom: 16 }}>
        <h2>Roles</h2>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(Object.keys(roles) as Role[]).map((r) => (
            <li key={r}>
              <b>{r}</b> — {roles[r]}
            </li>
          ))}
        </ul>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Active</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>{u.full_name || "—"}</b> {u.id === me && <span className="badge badge--blue">you</span>}
                  <div className="muted">{u.email}</div>
                </td>
                <td>
                  <select className="a-input" value={u.role} onChange={(e) => run(() => updateUser(u.id, { role: e.target.value as Role }), "Role updated")} aria-label={`Role for ${u.email}`}>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td>
                  <Switch checked={u.active} onChange={(v) => run(() => updateUser(u.id, { active: v }), v ? "Activated" : "Deactivated")} label={u.active ? "Active" : "Inactive"} />
                </td>
                <td className="mono">{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <button type="button" className="a-btn a-btn--sm" onClick={() => setPwFor(u.id)}>
                    Set password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && (
        <Modal title="Add user" onClose={() => setAdding(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createUser(form), "User created", () => {
                setAdding(false);
                setForm({ email: "", full_name: "", role: "editor", password: "" });
              });
            }}
          >
            <div className="a-row">
              <div className="a-field">
                <label htmlFor="u-name">Full name</label>
                <input id="u-name" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="a-field">
                <label htmlFor="u-email">Email</label>
                <input id="u-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="a-field">
                <label htmlFor="u-role">Role</label>
                <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="a-field">
                <label htmlFor="u-pw">Temporary password (10+ characters)</label>
                <input id="u-pw" type="password" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <button className="a-btn a-btn--primary" disabled={pending}>
              Create user
            </button>
          </form>
        </Modal>
      )}
      {pwFor && (
        <Modal title="Set password" onClose={() => setPwFor(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => updateUser(pwFor, { password: pw }), "Password updated", () => {
                setPwFor(null);
                setPw("");
              });
            }}
          >
            <div className="a-field">
              <label htmlFor="np">New password (10+ characters)</label>
              <input id="np" type="password" minLength={10} required value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <button className="a-btn a-btn--primary" disabled={pending}>
              Save password
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
