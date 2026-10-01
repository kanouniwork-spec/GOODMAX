"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { submitContactAction, submitDistributorAction, type FormState } from "@/app/actions/public";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type T = Partial<Dictionary>;

function useStarted() {
  const [t, setT] = useState(0);
  useEffect(() => setT(Date.now()), []);
  return t;
}

function useUtm() {
  const [utm, setUtm] = useState<Record<string, string>>({});
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    q.forEach((v, k) => {
      if (k.startsWith("utm_")) out[k] = v;
    });
    setUtm(out);
  }, []);
  return utm;
}

function Field({
  name,
  label,
  t,
  state,
  optional,
  children,
  full,
}: {
  name: string;
  label: string;
  t: T;
  state: FormState;
  optional?: boolean;
  children: (p: { id: string; name: string; "aria-invalid"?: boolean; "aria-describedby"?: string; required?: boolean }) => React.ReactNode;
  full?: boolean;
}) {
  const err = state.fieldErrors?.[name];
  const id = `f-${name}`;
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label htmlFor={id}>
        {label}
        {optional && <small>({t["common.optional"]})</small>}
      </label>
      {children({ id, name, "aria-invalid": err ? true : undefined, "aria-describedby": err ? `${id}-err` : undefined, required: !optional })}
      {err && (
        <span className="field-error" id={`${id}-err`}>
          {t[err]}
        </span>
      )}
    </div>
  );
}

function Hidden({ locale, source, started, utm }: { locale: string; source: string; started: number; utm?: Record<string, string> }) {
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="started_at" value={started} />
      {utm && Object.entries(utm).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
    </>
  );
}

const initial: FormState = { ok: false };

export function DistributorForm({
  t,
  locale,
  wilayas,
  brands,
  extraFields,
  successText,
}: {
  t: T;
  locale: string;
  wilayas: { value: string; label: string; municipalities: string[] }[];
  brands: string[];
  extraFields: { key: string; label: string; required: boolean }[];
  successText: string;
}) {
  const [state, action, pending] = useActionState(submitDistributorAction, initial);
  const started = useStarted();
  const utm = useUtm();
  const [wilaya, setWilaya] = useState("");
  const municipalities = useMemo(() => wilayas.find((w) => w.value === wilaya)?.municipalities ?? [], [wilaya, wilayas]);

  if (state.ok)
    return (
      <div className="form-status form-status--ok" role="status">
        {successText}
      </div>
    );

  return (
    <form action={action} className="form-grid" noValidate>
      <Hidden locale={locale} source="/distributors" started={started} utm={utm} />
      <Field name="full_name" label={t["form.full_name"]!} t={t} state={state}>
        {(p) => <input {...p} autoComplete="name" maxLength={120} />}
      </Field>
      <Field name="company" label={t["form.company"]!} t={t} state={state}>
        {(p) => <input {...p} autoComplete="organization" maxLength={160} />}
      </Field>
      <Field name="email" label={t["form.email"]!} t={t} state={state}>
        {(p) => <input {...p} type="email" autoComplete="email" dir="ltr" maxLength={200} />}
      </Field>
      <Field name="phone" label={t["form.phone"]!} t={t} state={state} optional>
        {(p) => <input {...p} type="tel" autoComplete="tel" dir="ltr" maxLength={40} />}
      </Field>
      <Field name="wilaya" label={t["form.wilaya"]!} t={t} state={state}>
        {(p) => (
          <select {...p} value={wilaya} onChange={(e) => setWilaya(e.target.value)}>
            <option value="">{t["form.select"]}</option>
            {wilayas.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field name="municipality" label={t["form.municipality"]!} t={t} state={state}>
        {(p) =>
          municipalities.length ? (
            <select {...p} key={wilaya} defaultValue="">
              <option value="">{t["form.select"]}</option>
              {municipalities.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          ) : (
            <input {...p} maxLength={120} />
          )
        }
      </Field>
      <Field name="city" label={t["form.city"]!} t={t} state={state}>
        {(p) => <input {...p} autoComplete="address-level2" maxLength={120} />}
      </Field>
      <Field name="commercial_register" label={t["form.commercial_register"]!} t={t} state={state} optional>
        {(p) => <input {...p} maxLength={80} dir="ltr" />}
      </Field>
      <Field name="interested_brand" label={t["form.interested_brand"]!} t={t} state={state} optional full>
        {(p) => (
          <select {...p} defaultValue="">
            <option value="">{t["form.any_brand"]}</option>
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        )}
      </Field>
      {extraFields.map((f) => (
        <Field key={f.key} name={`extra_${f.key}`} label={f.label} t={t} state={state} optional={!f.required} full>
          {(p) => <input {...p} maxLength={500} />}
        </Field>
      ))}
      {state.error && (
        <div className="form-status form-status--err full" role="alert">
          {t[state.error]}
        </div>
      )}
      <div className="full">
        <button className="btn btn--primary" type="submit" disabled={pending || !started}>
          {pending ? t["form.sending"] : t["form.submit"]}
          {!pending && <span className="arrow">→</span>}
        </button>
      </div>
    </form>
  );
}

export function ContactForm({ t, locale }: { t: T; locale: string }) {
  const [state, action, pending] = useActionState(submitContactAction, initial);
  const started = useStarted();
  if (state.ok)
    return (
      <div className="form-status form-status--ok" role="status">
        {t["form.contact_success"]}
      </div>
    );
  return (
    <form action={action} className="form-grid" noValidate>
      <Hidden locale={locale} source="/contact" started={started} />
      <Field name="full_name" label={t["form.full_name"]!} t={t} state={state}>
        {(p) => <input {...p} autoComplete="name" maxLength={120} />}
      </Field>
      <Field name="email" label={t["form.email"]!} t={t} state={state}>
        {(p) => <input {...p} type="email" autoComplete="email" dir="ltr" maxLength={200} />}
      </Field>
      <Field name="phone" label={t["form.phone"]!} t={t} state={state} optional>
        {(p) => <input {...p} type="tel" autoComplete="tel" dir="ltr" maxLength={40} />}
      </Field>
      <Field name="subject" label={t["form.subject"]!} t={t} state={state} optional>
        {(p) => <input {...p} maxLength={200} />}
      </Field>
      <Field name="message" label={t["form.message"]!} t={t} state={state} full>
        {(p) => <textarea {...p} maxLength={5000} />}
      </Field>
      {state.error && (
        <div className="form-status form-status--err full" role="alert">
          {t[state.error]}
        </div>
      )}
      <div className="full">
        <button className="btn btn--primary" type="submit" disabled={pending || !started}>
          {pending ? t["form.sending"] : t["form.send"]}
        </button>
      </div>
    </form>
  );
}
