import Link from "next/link";
import type { Locale, LocalizedText, PageSection } from "@/types/content";
import { loc, hasText } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { getBrands, getLocations, getProducts, getSetting, getSocials, getWilayas } from "@/lib/content/queries";
import { db } from "@/lib/data";
import { osmEmbed } from "@/lib/maps";
import { ALGERIA_OUTLINE } from "@/data/wilayas";
import { VideoStory, type StoryStage } from "./VideoStory";
import { ProductStage } from "./ProductCard";
import { TimelineProgress } from "./TimelineProgress";
import { ContactForm, DistributorForm } from "./forms";
import { LocationsExplorer } from "./LocationsExplorer";
import { PLATFORM_NAMES, SocialIcon } from "@/components/site/SocialIcon";

type C = Record<string, unknown>;
type Ctx = { c: C; locale: Locale; L: (k: string) => string; S: (k: string) => string };

function ctx(section: PageSection, locale: Locale): Ctx {
  const c = section.content_json ?? {};
  return {
    c,
    locale,
    L: (k) => loc(c[k] as LocalizedText, locale),
    S: (k) => (typeof c[k] === "string" ? (c[k] as string) : c[k] == null ? "" : String(c[k])),
  };
}

const Arrow = () => (
  <span className="arrow" aria-hidden="true">
    →
  </span>
);

function Head({ x, h1, className = "display-lg" }: { x: Ctx; h1?: boolean; className?: string }) {
  const eyebrow = x.L("eyebrow");
  const title = x.L("title");
  const subtitle = x.L("subtitle") || x.L("body");
  if (!eyebrow && !title && !subtitle) return null;
  const H = h1 ? "h1" : "h2";
  return (
    <div className="section-head reveal">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      {title && <H className={className}>{title}</H>}
      {subtitle && <p className="lead">{subtitle}</p>}
    </div>
  );
}

/** Endless logo strip; each logo opens that brand's product gallery. Pauses on hover/focus. */
function BrandMarquee({ brands, label }: { brands: { id: string; href: string; name: string; logo: string; accent: string }[]; label: string }) {
  // repeat short lists so one copy is wider than the screen, then render it twice for a seamless loop
  const copy = Array.from({ length: Math.max(1, Math.ceil(8 / brands.length)) }, () => brands).flat();
  return (
    <div className="brand-marquee" style={{ ["--marquee-duration" as string]: `${Math.max(20, copy.length * 4)}s` }}>
      {[0, 1].map((half) => (
        <ul className="brand-marquee__track" key={half} aria-hidden={half === 1 || undefined}>
          {copy.map((b, i) => (
            <li key={`${b.id}-${i}`} className={i >= brands.length ? "dup" : undefined}>
              <Link
                href={b.href}
                className="brand-logo"
                style={{ ["--accent" as string]: b.accent || undefined }}
                tabIndex={half === 1 || i >= brands.length ? -1 : undefined}
                aria-label={`${b.name}: ${label}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.logo ? <img src={b.logo} alt="" loading="lazy" /> : <span className="brand-logo__name">{b.name}</span>}
                <span className="brand-logo__cta">
                  {label} <Arrow />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export async function SectionRenderer({
  section,
  index,
  searchParams,
}: {
  section: PageSection;
  index: number;
  searchParams?: Record<string, string | undefined>;
}) {
  const { locale, dict, t } = await getI18n();
  const x = ctx(section, locale);
  const anchor = `s-${section.id}`;

  switch (section.section_type) {
    /* ------------------------------------------------------------------ */
    case "video_story": {
      const appearance = await getSetting("appearance");
      const stages: StoryStage[] = ((x.c.stages as C[]) ?? []).map((s) => ({
        label: loc(s.label as LocalizedText, locale),
        title: loc(s.title as LocalizedText, locale),
        points: loc(s.points as LocalizedText, locale)
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        side: s.side === "end" || s.side === "bottom" ? s.side : "start",
        from: typeof s.from === "number" ? s.from : undefined,
        to: typeof s.to === "number" ? s.to : undefined,
      }));
      return (
        <VideoStory
          videoUrl={x.S("video_url")}
          mobileVideoUrl={x.S("video_mobile_url") || undefined}
          webmUrl={x.S("video_webm_url") || undefined}
          poster={x.S("poster_url")}
          mobilePoster={x.S("poster_mobile_url") || undefined}
          lengthVh={Math.min(900, Math.max(250, Number(x.c.scroll_length_vh) || 500))}
          introLogo={x.c.intro_logo ? appearance.logo_light_url : undefined}
          introCaption={x.L("intro_caption") || undefined}
          hint={x.L("scroll_hint") || undefined}
          stages={stages}
          headerOverVideo={index === 0 && appearance.header_transparent_over_video}
          labels={{ story: t("story.label"), stage: t("story.stage"), skip: t("story.skip"), loading: t("story.loading") }}
        />
      );
    }

    /* ------------------------------------------------------------------ */
    case "hero": {
      const media = x.S("media_url");
      const type = x.S("media_type");
      const showMedia = media && type !== "none";
      return (
        <section className="hero" id={anchor}>
          <div className="grid-lines" />
          <div className={`container hero__grid${showMedia ? "" : " hero__grid--single"}`}>
            <div className="reveal">
              {x.L("eyebrow") && <span className="eyebrow">{x.L("eyebrow")}</span>}
              <h1 className="display-xl">{x.L("title")}</h1>
              {x.L("subtitle") && <p className="lead">{x.L("subtitle")}</p>}
            </div>
            {showMedia && (
              <div className="hero__media reveal">
                {type === "video" ? (
                  <video src={media} muted playsInline autoPlay loop aria-hidden="true" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media} alt="" fetchPriority="high" />
                )}
              </div>
            )}
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "brand_rail": {
      const limit = Number(x.c.limit) || 0;
      const brands = (await getBrands()).slice(0, limit || undefined);
      const products = await getProducts();
      return (
        <section className="section" id={anchor}>
          <div className="container">
            <Head x={x} />
            {brands.length === 0 ? (
              <p className="empty">{t("brands.empty")}</p>
            ) : (x.c.layout || (section.page_slug === "home" ? "marquee" : "cards")) === "marquee" ? (
              <BrandMarquee
                label={t("brands.view")}
                brands={brands.map((b) => ({
                  id: b.id,
                  href: `/products?brand=${encodeURIComponent(b.slug)}#products`,
                  name: loc(b.name_json, locale),
                  logo: b.logo_url,
                  accent: b.accent_color,
                }))}
              />
            ) : (
              <div className="brand-rail">
                {brands.map((b, i) => {
                  const count = products.filter((p) => p.brand_id === b.id).length;
                  return (
                    <Link
                      key={b.id}
                      href={`/products?brand=${encodeURIComponent(b.slug)}`}
                      className="brand-card reveal"
                      style={{ ["--accent" as string]: b.accent_color || undefined, transitionDelay: `${i * 60}ms` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {b.background_url && <img className="brand-card__bg" src={b.background_url} alt="" loading="lazy" />}
                      <div className="brand-card__top">
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        {b.is_placeholder && b.slug.startsWith("demo-") ? <span className="demo-chip">{t("common.demo")}</span> : <span>{count > 0 ? `${count}` : ""}</span>}
                      </div>
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {b.logo_url ? <img className="brand-card__logo" src={b.logo_url} alt={loc(b.name_json, locale)} /> : <h3>{loc(b.name_json, locale)}</h3>}
                        {b.logo_url && <span className="sr-only">{loc(b.name_json, locale)}</span>}
                        {hasText(b.description_json) && <p>{loc(b.description_json, locale)}</p>}
                        <span className="brand-card__cta">
                          {loc(b.cta_json, locale) || t("brands.view")} <Arrow />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "product_grid": {
      const [products, brands] = await Promise.all([getProducts(), getBrands()]);
      const brandSlug = searchParams?.brand;
      const brand = brands.find((b) => b.slug === brandSlug);
      const limit = Number(x.c.limit) || 0;
      const list = products.filter((p) => !brand || p.brand_id === brand.id).slice(0, limit || undefined);
      const brandsWithProducts = brands.filter((b) => products.some((p) => p.brand_id === b.id));
      return (
        <section className="section" id={anchor} style={{ paddingTop: 0 }}>
          <div className="container">
            <span id="products" className="anchor" />
            <Head x={x} />
            {brandsWithProducts.length > 0 && (
              <nav className="filter-bar" aria-label={t("products.filter")}>
                <Link className="chip" href="/products#products" scroll={false} aria-current={!brand}>
                  {t("products.all")}
                </Link>
                {brands.map((b) => (
                  <Link key={b.id} className="chip" href={`/products?brand=${b.slug}#products`} scroll={false} aria-current={brand?.id === b.id}>
                    {loc(b.name_json, locale)}
                  </Link>
                ))}
              </nav>
            )}
            {list.length === 0 ? (
              <p className="empty">{t("products.empty")}</p>
            ) : (
              <div className="product-list">
                {list.map((p) => {
                  const media = [...p.media]
                    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
                    .map((m) => ({ type: m.media_type, url: m.url, alt: loc(m.alt_json, locale) || loc(p.name_json, locale) }));
                  const b = brands.find((br) => br.id === p.brand_id);
                  const features = p.features.filter((f) => f.visible);
                  return (
                    <article key={p.id} className="product-card reveal" id={p.slug}>
                      <ProductStage media={media} thumbsLabel={loc(p.name_json, locale)} />
                      <div className="product-card__body">
                        {b && <span className="product-card__brand">{loc(b.name_json, locale)}</span>}
                        <h3>{loc(p.name_json, locale)}</h3>
                        {hasText(p.short_description_json) && <p className="product-card__desc">{loc(p.short_description_json, locale)}</p>}
                        {hasText(p.description_json) && <p style={{ whiteSpace: "pre-line" }}>{loc(p.description_json, locale)}</p>}
                        {features.length > 0 && (
                          <>
                            <span className="eyebrow" style={{ marginTop: 8 }}>
                              {t("products.characteristics")}
                            </span>
                            <ul className="features">
                              {features.map((f, i) => (
                                <li key={f.id}>
                                  <span>{loc(f.label_json, locale) || String(i + 1).padStart(2, "0")}</span>
                                  <div>
                                    <b>{loc(f.title_json, locale)}</b>
                                    {hasText(f.body_json) && <p>{loc(f.body_json, locale)}</p>}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                        {p.cta_url && hasText(p.cta_json) && (
                          <Link className="btn" href={p.cta_url}>
                            {loc(p.cta_json, locale)} <Arrow />
                          </Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "rich_text":
      return (
        <section className="section" id={anchor}>
          <div className="grid-lines" />
          <div className="container editorial">
            <div className="reveal">
              {x.L("eyebrow") && <span className="eyebrow">{x.L("eyebrow")}</span>}
              <h2 className="display-lg" style={{ marginTop: 22 }}>
                {x.L("title")}
              </h2>
            </div>
            <div className="editorial__body reveal">
              {x.L("body") && <p>{x.L("body")}</p>}
              {x.L("link_label") && x.S("link_url") && (
                <Link className="text-link" href={x.S("link_url")} style={{ justifySelf: "start" }}>
                  {x.L("link_label")} <Arrow />
                </Link>
              )}
            </div>
          </div>
        </section>
      );

    /* ------------------------------------------------------------------ */
    case "timeline": {
      const items = ((x.c.items as C[]) ?? []).filter((i) => i.visible !== false);
      return (
        <section className="section section--surface" id={anchor}>
          <div className="container">
            <Head x={x} />
            <ol className="timeline" style={{ ["--cols" as string]: Math.max(1, Math.min(items.length, 5)), listStyle: "none", margin: 0, padding: 0 }}>
              <TimelineProgress />
              {items.map((it, i) => (
                <li key={i} className="timeline__item reveal" style={{ transitionDelay: `${i * 120}ms` }}>
                  <span className="timeline__dot" />
                  <div className="timeline__year">{loc(it.year as LocalizedText, locale)}</div>
                  <h3>{loc(it.title as LocalizedText, locale)}</h3>
                  <p>{loc(it.body as LocalizedText, locale)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "image_text": {
      const img = x.S("image_url");
      const end = x.S("image_side") === "end";
      return (
        <section className="section" id={anchor}>
          <div className="container editorial" style={{ alignItems: "center" }}>
            <div className="hero__media reveal" style={{ order: end ? 2 : 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {img && <img src={img} alt="" loading="lazy" />}
            </div>
            <div className="reveal" style={{ display: "grid", gap: 22 }}>
              {x.L("eyebrow") && <span className="eyebrow">{x.L("eyebrow")}</span>}
              <h2 className="display-md">{x.L("title")}</h2>
              {x.L("body") && <p className="lead" style={{ whiteSpace: "pre-line" }}>{x.L("body")}</p>}
              {x.L("link_label") && x.S("link_url") && (
                <Link className="text-link" href={x.S("link_url")} style={{ justifySelf: "start" }}>
                  {x.L("link_label")} <Arrow />
                </Link>
              )}
            </div>
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "values": {
      const items = (x.c.items as C[]) ?? [];
      return (
        <section className="section" id={anchor}>
          <div className="container">
            <Head x={x} />
            <div className="values">
              {items.map((it, i) => (
                <div key={i} className="values__item reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                  <span>{loc(it.label as LocalizedText, locale)}</span>
                  <h3>{loc(it.title as LocalizedText, locale)}</h3>
                  <p>{loc(it.body as LocalizedText, locale)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "network": {
      const [wilayas, locations, allWilayas] = await Promise.all([getWilayas(), getLocations(), db().list("wilayas")]);
      const covered = new Set(locations.map((l) => l.wilaya));
      const general = await getSetting("general");
      return (
        <section className="section section--dark" id={anchor} style={index === 0 ? { paddingTop: "calc(var(--header-h) + 96px)" } : undefined}>
          <div className="grid-lines" />
          <div className="container network">
            <div className="reveal">
              {x.L("eyebrow") && <span className="eyebrow">{x.L("eyebrow")}</span>}
              {index === 0 ? (
                <h1 className="display-lg" style={{ marginTop: 22 }}>
                  {x.L("title")}
                </h1>
              ) : (
                <h2 className="display-lg" style={{ marginTop: 22 }}>
                  {x.L("title")}
                </h2>
              )}
              {x.L("body") && (
                <p className="lead" style={{ marginTop: 22 }}>
                  {x.L("body")}
                </p>
              )}
              {x.S("stat_value") && (
                <div className="network__stat">
                  <b>{x.S("stat_value")}</b>
                  <span>{x.L("stat_label")}</span>
                </div>
              )}
              <div className="network__actions">
                {x.L("cta_primary_label") && x.S("cta_primary_url") && (
                  <Link className="btn btn--primary" href={x.S("cta_primary_url")}>
                    {x.L("cta_primary_label")} <Arrow />
                  </Link>
                )}
                {x.L("cta_secondary_label") && x.S("cta_secondary_url") && (
                  <Link className="btn btn--ghost" href={x.S("cta_secondary_url")}>
                    {x.L("cta_secondary_label")}
                  </Link>
                )}
              </div>
              <div className="network__meta">
                <span>
                  <b>{wilayas.length}</b>/{general.wilaya_target || allWilayas.length} {t("network.wilayas_listed")}
                </span>
                {covered.size > 0 && (
                  <span>
                    <b>{covered.size}</b> {t("network.active")}
                  </span>
                )}
              </div>
            </div>
            <div className="reveal">
              <NetworkMap nodes={wilayas.map((w) => ({ id: w.id, lat: w.latitude, lng: w.longitude, active: covered.has(w.id), name: loc(w.name_json, locale) }))} />
            </div>
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "distributor_cta":
      return (
        <section className="section" id={anchor}>
          <div className="container">
            <div className="cta-band reveal">
              <div>
                {x.L("eyebrow") && <span className="eyebrow">{x.L("eyebrow")}</span>}
                <h2 className="display-lg" style={{ marginTop: 20 }}>
                  {x.L("title")}
                </h2>
                {x.L("body") && <p className="lead">{x.L("body")}</p>}
              </div>
              {x.L("cta_label") && x.S("cta_url") && (
                <Link className="btn btn--primary" href={x.S("cta_url")} style={{ position: "relative", zIndex: 1 }}>
                  {x.L("cta_label")} <Arrow />
                </Link>
              )}
            </div>
          </div>
        </section>
      );

    /* ------------------------------------------------------------------ */
    case "distributor_form": {
      const [wilayas, brands, general] = await Promise.all([getWilayas(), getBrands(), getSetting("general")]);
      return (
        <section className="section" id={anchor} style={{ paddingTop: 0 }}>
          <div className="container editorial">
            <div className="reveal" style={{ position: "sticky", top: "calc(var(--header-h) + 32px)" }}>
              <Head x={x} className="display-md" />
            </div>
            <div className="form-card reveal">
              <DistributorForm
                t={dict}
                locale={locale}
                wilayas={wilayas.map((w) => ({
                  value: w.id,
                  label: `${String(w.code).padStart(2, "0")} — ${loc(w.name_json, locale)}`,
                  municipalities: w.municipalities,
                }))}
                brands={brands.filter((b) => !b.slug.startsWith("demo-")).map((b) => loc(b.name_json, locale))}
                extraFields={general.distributor_extra_fields.map((f) => ({ key: f.key, label: loc(f.label_json, locale), required: f.required }))}
                successText={x.L("success_text")}
              />
            </div>
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "locations_list": {
      const [locations, wilayas] = await Promise.all([getLocations(), db().list("wilayas")]);
      const wName = (id: string) => {
        const w = wilayas.find((x) => x.id === id);
        return w ? loc(w.name_json, locale) || `Wilaya ${w.code}` : id;
      };
      return (
        <section className="section" id={anchor}>
          <div className="container">
            <Head x={x} />
            {locations.length === 0 ? (
              <p className="empty">{x.L("empty_text")}</p>
            ) : (
              <LocationsExplorer
                locations={locations.map((l) => ({
                  id: l.id,
                  name: loc(l.name_json, locale),
                  type: t(`locations.type.${l.location_type}` as "locations.type.other"),
                  wilaya: l.wilaya,
                  wilayaLabel: wName(l.wilaya),
                  municipality: l.municipality,
                  address: loc(l.address_json, locale),
                  phone: l.phone,
                  email: l.email,
                  hours: loc(l.hours_json, locale),
                  mapsUrl: l.maps_url,
                  lat: l.latitude,
                  lng: l.longitude,
                }))}
                labels={{ all: t("locations.all_wilayas"), directions: t("locations.directions"), hours: t("locations.hours"), map: t("locations.map") }}
              />
            )}
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "contact_block": {
      const [general, socials] = await Promise.all([getSetting("general"), getSocials()]);
      const address = loc(general.address_json, locale);
      const hasMap = general.factory_latitude != null && general.factory_longitude != null;
      const nothing = !general.general_email && !general.distributor_email && !general.phone && !address;
      return (
        <section className="section" id={anchor} style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="contact-grid">
              <div className="contact-info reveal">
                {x.L("title") && <h2 className="display-md">{x.L("title")}</h2>}
                {nothing && <p style={{ color: "var(--c-muted)" }}>{t("contact.pending")}</p>}
                {(general.general_email || general.phone) && (
                  <div>
                    <h3>{t("contact.general")}</h3>
                    {general.general_email && (
                      <p>
                        <a href={`mailto:${general.general_email}`}>{general.general_email}</a>
                      </p>
                    )}
                    {general.phone && (
                      <p dir="ltr" style={{ textAlign: "start" }}>
                        <a href={`tel:${general.phone.replace(/\s+/g, "")}`}>{general.phone}</a>
                      </p>
                    )}
                  </div>
                )}
                {general.distributor_email && (
                  <div>
                    <h3>{t("contact.distribution")}</h3>
                    <p>
                      <a href={`mailto:${general.distributor_email}`}>{general.distributor_email}</a>
                    </p>
                  </div>
                )}
                {address && (
                  <div>
                    <h3>{t("contact.location")}</h3>
                    <p style={{ whiteSpace: "pre-line" }}>{address}</p>
                    {general.factory_maps_url && (
                      <a className="text-link" href={general.factory_maps_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 8 }}>
                        {t("contact.open_maps")} →
                      </a>
                    )}
                  </div>
                )}
                {x.c.show_socials !== false && socials.length > 0 && (
                  <div>
                    <h3>{t("contact.follow")}</h3>
                    <div className="socials">
                      {socials.map((s) => (
                        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer">
                          <SocialIcon platform={s.platform} /> {s.label || PLATFORM_NAMES[s.platform]}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {x.c.show_form !== false && (
                <div className="form-card reveal">
                  <ContactForm t={dict} locale={locale} />
                </div>
              )}
            </div>
            {x.c.show_map !== false && hasMap && (
              <iframe
                className="map-frame reveal"
                style={{ marginTop: 48, position: "static", aspectRatio: "21 / 9" }}
                title={t("contact.location")}
                src={osmEmbed(general.factory_latitude!, general.factory_longitude!)}
                loading="lazy"
              />
            )}
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "gallery": {
      const items = ((x.c.items as C[]) ?? []).filter((i) => i.image_url);
      return (
        <section className="section" id={anchor}>
          <div className="container">
            <Head x={x} />
            <div className="gallery">
              {items.map((it, i) => (
                <figure key={i} className="reveal">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={String(it.image_url)} alt={loc(it.caption as LocalizedText, locale)} loading="lazy" />
                  {hasText(it.caption as LocalizedText) && <figcaption>{loc(it.caption as LocalizedText, locale)}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    }

    /* ------------------------------------------------------------------ */
    case "video":
      return (
        <section className="section video-block" id={anchor}>
          <div className="container">
            <Head x={x} />
            {x.S("video_url") && <video src={x.S("video_url")} poster={x.S("poster_url") || undefined} controls playsInline preload="metadata" />}
          </div>
        </section>
      );

    /* ------------------------------------------------------------------ */
    case "footer_cta":
      return (
        <section className="section" id={anchor} style={{ paddingBlock: 64, borderTop: "1px solid var(--c-border)" }}>
          <div className="container" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="display-md">{x.L("title")}</h2>
            {x.L("cta_label") && x.S("cta_url") && (
              <Link className="btn" href={x.S("cta_url")}>
                {x.L("cta_label")} <Arrow />
              </Link>
            )}
          </div>
        </section>
      );
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/* Algeria network map (server-rendered SVG)                                   */
/* -------------------------------------------------------------------------- */

const LNG0 = -9.2;
const LAT1 = 37.6;
const K = 26; // px per degree
const COS = Math.cos((28 * Math.PI) / 180);
const project = (lng: number, lat: number): [number, number] => [(lng - LNG0) * K * COS, (LAT1 - lat) * K];

function inside(lng: number, lat: number) {
  let hit = false;
  const poly = ALGERIA_OUTLINE;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

let dotCache: [number, number][] | null = null;
function dots() {
  if (dotCache) return dotCache;
  const out: [number, number][] = [];
  for (let lat = 18.8; lat <= 37.3; lat += 0.42) {
    for (let lng = -8.8; lng <= 12; lng += 0.42 / COS) {
      if (inside(lng, lat)) out.push(project(lng, lat));
    }
  }
  return (dotCache = out);
}

function NetworkMap({ nodes }: { nodes: { id: string; lat: number | null; lng: number | null; active: boolean; name: string }[] }) {
  const pts = nodes.filter((n) => n.lat != null && n.lng != null).map((n) => ({ ...n, p: project(n.lng!, n.lat!) }));
  const links = new Set<string>();
  const lines: [number, number, number, number][] = [];
  for (const a of pts) {
    const nearest = pts
      .filter((b) => b.id !== a.id)
      .map((b) => ({ b, d: Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]) }))
      .sort((m, n) => m.d - n.d)
      .slice(0, 2);
    for (const { b } of nearest) {
      const key = [a.id, b.id].sort().join("|");
      if (links.has(key)) continue;
      links.add(key);
      lines.push([a.p[0], a.p[1], b.p[0], b.p[1]]);
    }
  }
  const w = (12.3 - LNG0) * K * COS;
  const h = (LAT1 - 18.6) * K;
  const outline = ALGERIA_OUTLINE.map(([lng, lat]) => project(lng, lat).join(",")).join(" ");
  return (
    <svg className="network-map" viewBox={`0 0 ${w.toFixed(0)} ${h.toFixed(0)}`} role="img" aria-label="Algeria network">
      <defs>
        <radialGradient id="nm-glow" cx="50%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#1d5bd8" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1d5bd8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill="url(#nm-glow)" />
      <polygon className="outline" points={outline} />
      {dots().map(([cx, cy], i) => (
        <circle key={i} className="dot" cx={cx.toFixed(1)} cy={cy.toFixed(1)} r={1.3} />
      ))}
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} className="link" x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
      {pts.map((n, i) => (
        <g key={n.id}>
          <title>{n.name}</title>
          <circle className="node-halo" cx={n.p[0]} cy={n.p[1]} r={6} style={{ animationDelay: `${(i % 12) * 0.27}s` }} />
          <circle className={`node${n.active ? " node--active" : ""}`} cx={n.p[0]} cy={n.p[1]} r={n.active ? 3.2 : 2.2} />
        </g>
      ))}
    </svg>
  );
}
