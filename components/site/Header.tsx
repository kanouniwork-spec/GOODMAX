"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { Locale } from "@/types/content";
import { LOCALE_META } from "@/lib/i18n";
import { setLocaleAction } from "@/app/actions/public";

type Props = {
  nav: { href: string; label: string }[];
  locale: Locale;
  locales: Locale[];
  logo: string;
  logoLight: string;
  siteName: string;
  labels: { menu: string; close: string; primary: string; language: string };
};

export function LangSwitch({ locale, locales, label }: { locale: Locale; locales: Locale[]; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const change = (l: Locale) => {
    if (l === locale) return;
    document.documentElement.lang = l;
    document.documentElement.dir = LOCALE_META[l].dir;
    start(async () => {
      await setLocaleAction(l);
      router.refresh();
    });
  };
  return (
    <div className="lang-switch" role="group" aria-label={label} aria-busy={pending}>
      {locales.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === locale} onClick={() => change(l)} title={LOCALE_META[l].native}>
          {LOCALE_META[l].label}
        </button>
      ))}
    </div>
  );
}

export function Header({ nav, locale, locales, logo, logoLight, siteName, labels }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const close = useCallback(() => {
    setOpen(false);
    menuBtn.current?.focus();
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && drawer.current) {
        const els = drawer.current.querySelectorAll<HTMLElement>("a,button");
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="site-header__logo" aria-label={siteName}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-dark" src={logo} alt={siteName} width={148} height={34} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="logo-light" src={logoLight} alt="" aria-hidden width={148} height={34} />
        </Link>
        <nav className="site-nav" aria-label={labels.primary}>
          <ul>
            {nav.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <LangSwitch locale={locale} locales={locales} label={labels.language} />
          <button
            ref={menuBtn}
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls="mobile-drawer"
            aria-label={labels.menu}
            onClick={() => setOpen(true)}
          >
            <span />
          </button>
        </div>
      </div>
      {open && (
        <>
          <div className="drawer-backdrop" onClick={close} />
          <div id="mobile-drawer" ref={drawer} className="drawer" role="dialog" aria-modal="true" aria-label={labels.menu}>
            <div className="drawer__top">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt={siteName} width={130} height={30} style={{ width: 130, height: "auto" }} />
              <button type="button" className="close-btn" onClick={close} aria-label={labels.close}>
                ×
              </button>
            </div>
            <nav aria-label={labels.primary}>
              <ul>
                {nav.map((n, i) => (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>
                      {n.label}
                      <small style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--c-muted)" }}>0{i + 1}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div style={{ marginTop: "auto", paddingTop: 32 }}>
              <LangSwitch locale={locale} locales={locales} label={labels.language} />
            </div>
          </div>
        </>
      )}
    </header>
  );
}
