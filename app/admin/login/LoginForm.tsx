"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm({ hint }: { hint?: string }) {
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/goodmax-logo.png" alt="GOODMAX" width={150} height={34} />
      <h1 style={{ fontSize: 18, marginBottom: 18, textAlign: "center" }}>Admin sign in</h1>
      {state.error && <div className="a-alert a-alert--err" role="alert">{state.error}</div>}
      <div className="a-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="a-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="a-btn a-btn--primary" style={{ width: "100%", justifyContent: "center", minHeight: 42 }} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {hint && <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>{hint}</p>}
    </form>
  );
}
