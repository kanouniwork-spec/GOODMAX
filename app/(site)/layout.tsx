import type { Metadata, Viewport } from "next";
import "../globals.css";
import { fontVars } from "@/lib/fonts";
import { LOCALE_META, loc } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getSetting, isPreview } from "@/lib/content/queries";
import { appearanceVars } from "@/lib/appearance";
import { activePixels } from "@/lib/pixels";
import { db } from "@/lib/data";
import { NAV } from "@/lib/nav";
import { siteUrl } from "@/lib/seo";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Consent } from "@/components/site/Consent";
import { RevealObserver } from "@/components/site/Reveal";

export async function generateMetadata(): Promise<Metadata> {
  const a = await getSetting("appearance");
  return {
    metadataBase: new URL(siteUrl()),
    icons: a.favicon_url ? { icon: a.favicon_url } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#030d1c", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  const [appearance, general, consent, pixels, preview] = await Promise.all([
    getSetting("appearance"),
    getSetting("general"),
    getSetting("consent"),
    db().list("marketing_pixels"),
    isPreview(),
  ]);
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: general.site_name,
    url: siteUrl(),
    logo: `${siteUrl()}${appearance.logo_url}`,
  };
  return (
    <html lang={locale} dir={LOCALE_META[locale].dir} className={fontVars} style={appearanceVars(appearance) as React.CSSProperties}>
      <body>
        <a href="#main" className="skip-link">
          {t("a11y.skip")}
        </a>
        <Header
          nav={NAV.map((n) => ({ href: n.href, label: t(n.key) }))}
          locale={locale}
          locales={general.enabled_locales}
          logo={appearance.logo_url}
          logoLight={appearance.header_transparent_over_video ? appearance.logo_light_url : appearance.logo_url}
          siteName={general.site_name}
          labels={{ menu: t("nav.menu"), close: t("nav.close"), primary: t("nav.primary"), language: t("nav.language") }}
        />
        <main id="main">{children}</main>
        <Footer />
        <RevealObserver />
        <Consent
          pixels={activePixels(pixels)}
          requireConsent={consent.enabled}
          text={loc(consent.text_json, locale)}
          labels={{ accept: t("consent.accept"), decline: t("consent.decline") }}
        />
        {preview && (
          <div className="preview-bar" role="status">
            {t("preview.banner")}
            <a href="/api/preview?off=1">{t("preview.exit")}</a>
          </div>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />
      </body>
    </html>
  );
}
