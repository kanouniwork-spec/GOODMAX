"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import type { Locale } from "@/types/content";
import { db, newId } from "@/lib/data";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

/* ---------------- anti-spam ---------------- */

const hits = new Map<string, number[]>();
async function rateLimited(bucket: string, max = 5, windowMs = 10 * 60 * 1000) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

function spamCheck(form: FormData) {
  if (String(form.get("website") ?? "").trim()) return true; // honeypot
  const started = Number(form.get("started_at") ?? 0);
  return !started || Date.now() - started < 2500; // filled faster than a human can
}

export type FormState = {
  ok: boolean;
  /** dictionary keys, so the client renders them in the visitor's language */
  error?: "form.error.generic" | "form.error.spam" | "form.error.fix";
  fieldErrors?: Record<string, "form.error.required" | "form.error.email" | "form.error.too_long">;
};

const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1);

function toFieldErrors(err: z.ZodError): FormState["fieldErrors"] {
  const out: NonNullable<FormState["fieldErrors"]> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0]);
    if (out[k]) continue;
    if (k === "email" && issue.code === "invalid_format") out[k] = "form.error.email";
    else if (issue.code === "too_big") out[k] = "form.error.too_long";
    else out[k] = "form.error.required";
  }
  return out;
}

const distributorSchema = z.object({
  full_name: required(120),
  company: required(160),
  city: required(120),
  wilaya: required(80),
  municipality: required(120),
  email: z.email().max(200),
  phone: text(40),
  commercial_register: text(80),
  interested_brand: text(120),
});

function utmFrom(form: FormData) {
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = String(form.get(k) ?? "").slice(0, 200);
    if (v) utm[k] = v;
  }
  return utm;
}

export async function submitDistributorAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (spamCheck(form) || (await rateLimited("distributor"))) return { ok: false, error: "form.error.spam" };
  const raw = Object.fromEntries(
    ["full_name", "company", "city", "wilaya", "municipality", "email", "phone", "commercial_register", "interested_brand"].map((k) => [
      k,
      String(form.get(k) ?? ""),
    ]),
  );
  const parsed = distributorSchema.safeParse(raw);
  const general = await db().getSetting("general");
  const extraErrors: NonNullable<FormState["fieldErrors"]> = {};
  const extra: Record<string, string> = {};
  for (const f of general.distributor_extra_fields) {
    const v = String(form.get(`extra_${f.key}`) ?? "").trim().slice(0, 500);
    if (f.required && !v) extraErrors[`extra_${f.key}`] = "form.error.required";
    if (v) extra[f.key] = v;
  }
  if (!parsed.success || Object.keys(extraErrors).length) {
    return { ok: false, error: "form.error.fix", fieldErrors: { ...(parsed.success ? {} : toFieldErrors(parsed.error)), ...extraErrors } };
  }
  const locale = String(form.get("locale") ?? "en");
  const now = new Date().toISOString();
  try {
    await db().insert("distributor_requests", {
      id: newId("req"),
      ...parsed.data,
      extra_json: extra,
      status: "new",
      internal_notes: "",
      locale: (isLocale(locale) ? locale : "en") as Locale,
      source: String(form.get("source") ?? "/distributors").slice(0, 200),
      utm_json: utmFrom(form),
      created_at: now,
      updated_at: now,
    });
    return { ok: true };
  } catch (e) {
    console.error("distributor request failed", e);
    return { ok: false, error: "form.error.generic" };
  }
}

const contactSchema = z.object({
  full_name: required(120),
  email: z.email().max(200),
  phone: text(40),
  subject: text(200),
  message: required(5000),
});

export async function submitContactAction(_prev: FormState, form: FormData): Promise<FormState> {
  if (spamCheck(form) || (await rateLimited("contact"))) return { ok: false, error: "form.error.spam" };
  const parsed = contactSchema.safeParse(
    Object.fromEntries(["full_name", "email", "phone", "subject", "message"].map((k) => [k, String(form.get(k) ?? "")])),
  );
  if (!parsed.success) return { ok: false, error: "form.error.fix", fieldErrors: toFieldErrors(parsed.error) };
  const locale = String(form.get("locale") ?? "en");
  const now = new Date().toISOString();
  try {
    await db().insert("contact_messages", {
      id: newId("msg"),
      ...parsed.data,
      status: "new",
      internal_notes: "",
      locale: (isLocale(locale) ? locale : "en") as Locale,
      source: String(form.get("source") ?? "/contact").slice(0, 200),
      created_at: now,
      updated_at: now,
    });
    return { ok: true };
  } catch (e) {
    console.error("contact message failed", e);
    return { ok: false, error: "form.error.generic" };
  }
}
