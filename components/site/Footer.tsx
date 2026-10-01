import Link from "next/link";
import { loc, LOCALE_META } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getSetting, getSocials } from "@/lib/content/queries";
import { NAV } from "@/lib/nav";
import { PLATFORM_NAMES, SocialIcon } from "./SocialIcon";

export async function Footer() {
  const { locale, t } = await getI18n();
  const [footer, general, appearance, socials] = await Promise.all([
    getSetting("footer"),
    getSetting("general"),
    getSetting("appearance"),
    getSocials(),
  ]);
  const legal = footer.legal_links.filter((l) => l.visible && l.url);
  const address = loc(general.address_json, locale);
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={appearance.logo_light_url} alt={general.site_name} width={180} height={40} />
            <p>{loc(footer.statement_json, locale)}</p>
          </div>
          <div>
            <h2>{t("footer.navigation")}</h2>
            <ul>
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href}>{t(n.key)}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>{t("footer.contact")}</h2>
            <ul>
              {general.general_email && (
                <li>
                  <a href={`mailto:${general.general_email}`}>{general.general_email}</a>
                </li>
              )}
              {general.phone && (
                <li>
                  <a href={`tel:${general.phone.replace(/\s+/g, "")}`} dir="ltr">
                    {general.phone}
                  </a>
                </li>
              )}
              {address && <li className="muted">{address}</li>}
              {!general.general_email && !general.phone && !address && <li className="muted">{t("contact.pending")}</li>}
              <li>
                <Link href="/contact">{t("nav.contact")} →</Link>
              </li>
            </ul>
          </div>
          <div>
            {socials.length > 0 && (
              <>
                <h2>{t("footer.follow")}</h2>
                <div className="socials" style={{ marginBottom: 28 }}>
                  {socials.map((s) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label || PLATFORM_NAMES[s.platform]}>
                      <SocialIcon platform={s.platform} />
                    </a>
                  ))}
                </div>
              </>
            )}
            {footer.show_languages && (
              <>
                <h2>{t("footer.languages")}</h2>
                <ul>
                  {general.enabled_locales.map((l) => (
                    <li key={l} lang={l} className={l === locale ? undefined : "muted"}>
                      {LOCALE_META[l].native}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>
            © {new Date().getFullYear()} {general.site_name}. {loc(footer.copyright_json, locale)}
          </span>
          {legal.length > 0 && (
            <ul>
              {legal.map((l) => (
                <li key={l.id}>
                  <a href={l.url}>{loc(l.label_json, locale)}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
