/**
 * Initial content. Everything here is editable from Admin.
 *
 * Rules followed: no invented company facts. The product feature copy comes
 * from the owner's brief; anything the owner still has to supply (company
 * story, milestones, brand names, contact details) is marked
 * `is_placeholder: true` and reported on the Admin dashboard.
 */
import type {
  AppearanceSettings,
  Brand,
  Collections,
  FooterSettings,
  GeneralSettings,
  LocalizedText,
  MarketingPixel,
  MediaItem,
  Page,
  PageSection,
  Product,
  SeoEntry,
  SiteSettingsMap,
  SocialLink,
} from "@/types/content";
import { seedWilayas, WILAYA_TARGET } from "./wilayas";

const now = () => new Date().toISOString();
const L = (en: string, fr: string, ar: string): LocalizedText => ({ en, fr, ar });

export const DEFAULT_GENERAL: GeneralSettings = {
  site_name: "GOODMAX",
  tagline_json: L("Engineered for a precise shave.", "Conçu pour un rasage précis.", "مصمم لحلاقة دقيقة."),
  general_email: "",
  distributor_email: "",
  phone: "",
  address_json: {},
  factory_maps_url: "",
  factory_latitude: null,
  factory_longitude: null,
  default_locale: "en",
  enabled_locales: ["en", "fr", "ar"],
  wilaya_target: WILAYA_TARGET,
  distributor_extra_fields: [],
};

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  primary: "#1d5bd8",
  navy: "#072f54",
  background: "#ffffff",
  text: "#0a1626",
  muted: "#5b6779",
  border: "#e3e8ef",
  card_radius: 20,
  button_radius: 999,
  section_spacing: 128,
  header_transparent_over_video: true,
  logo_url: "/media/goodmax-logo.png",
  logo_light_url: "/media/goodmax-logo-white.png",
  favicon_url: "",
};

export const DEFAULT_FOOTER: FooterSettings = {
  statement_json: L(
    "Precision shaving products, distributed across Algeria.",
    "Des produits de rasage de précision, distribués à travers l'Algérie.",
    "منتجات حلاقة دقيقة، موزعة عبر الجزائر.",
  ),
  legal_links: [
    { id: "legal-privacy", label_json: L("Privacy policy", "Politique de confidentialité", "سياسة الخصوصية"), url: "", visible: false },
    { id: "legal-terms", label_json: L("Terms of use", "Conditions d'utilisation", "شروط الاستخدام"), url: "", visible: false },
  ],
  copyright_json: L("All rights reserved.", "Tous droits réservés.", "جميع الحقوق محفوظة."),
  show_languages: true,
};

export const DEFAULT_SETTINGS: SiteSettingsMap = {
  general: DEFAULT_GENERAL,
  appearance: DEFAULT_APPEARANCE,
  footer: DEFAULT_FOOTER,
  ui_strings: {},
  consent: {
    enabled: true,
    text_json: L(
      "We use optional marketing cookies to measure our campaigns. You can accept or decline.",
      "Nous utilisons des cookies marketing optionnels pour mesurer nos campagnes. Vous pouvez accepter ou refuser.",
      "نستخدم ملفات تعريف ارتباط تسويقية اختيارية لقياس حملاتنا. يمكنك القبول أو الرفض.",
    ),
  },
};

let counter = 0;
function section(
  page_slug: PageSection["page_slug"],
  section_type: PageSection["section_type"],
  content_json: Record<string, unknown>,
  opts: { placeholder?: boolean } = {},
): PageSection {
  counter += 1;
  return {
    id: `sec-${page_slug}-${section_type}-${counter}`,
    page_slug,
    section_type,
    content_json,
    visible: true,
    sort_order: counter,
    // Seeds start published so the site renders in all three languages.
    published_snapshot: { content_json: JSON.parse(JSON.stringify(content_json)) },
    published_at: now(),
    updated_at: now(),
    updated_by: "seed",
    is_placeholder: opts.placeholder ?? false,
  };
}

const PH = L(
  "Placeholder — replace in Admin › Page Builder.",
  "Texte provisoire — à remplacer dans Admin › Page Builder.",
  "نص مؤقت — يُستبدل من الإدارة › منشئ الصفحات.",
);

function sections(): PageSection[] {
  counter = 0;
  return [
    /* ---------------- HOME ---------------- */
    section("home", "video_story", {
      video_url: "/media/product-scroll.mp4",
      video_mobile_url: "/media/product-scroll-720.mp4",
      video_webm_url: "/media/product-scroll.webm",
      poster_url: "/media/product-scroll-poster.jpg",
      poster_mobile_url: "/media/product-scroll-poster-mobile.jpg",
      scroll_length_vh: 500,
      intro_logo: true,
      intro_caption: L("Precision, engineered.", "La précision, conçue.", "دقة مُصمَّمة."),
      scroll_hint: L("Scroll to explore", "Défilez pour explorer", "مرّر للاستكشاف"),
      // Ranges follow the footage: full razor, grip close-up, blade close-up, angled cartridge.
      stages: [
        {
          label: L("Blade system", "Système de lames", "نظام الشفرات"),
          title: L("Six precision blades", "Six lames de précision", "ست شفرات دقيقة"),
          points: L(
            "Multi-blade geometry\nClose and consistent shaving path",
            "Géométrie multi-lames\nUn passage proche et régulier",
            "هندسة متعددة الشفرات\nمسار حلاقة قريب ومنتظم",
          ),
          side: "start",
          from: 11,
          to: 31,
        },
        {
          label: L("Control", "Contrôle", "التحكم"),
          title: L("Soft-touch grip", "Prise en main soft-touch", "مقبض ناعم الملمس"),
          points: L(
            "Balanced handling\nConfident control",
            "Une prise en main équilibrée\nUn contrôle assuré",
            "توازن في الاستخدام\nتحكم بثقة",
          ),
          side: "end",
          from: 33,
          to: 45,
        },
        {
          label: L("Comfort", "Confort", "الراحة"),
          title: L("Comfort strip", "Bande de confort", "شريط الراحة"),
          points: L(
            "Smoother glide\nControlled shaving movement",
            "Une glisse plus douce\nUn mouvement de rasage maîtrisé",
            "انزلاق أكثر سلاسة\nحركة حلاقة متحكم بها",
          ),
          side: "bottom",
          from: 47,
          to: 62,
        },
        {
          label: L("Protection", "Protection", "الحماية"),
          title: L("Protective architecture", "Architecture protectrice", "بنية واقية"),
          points: L(
            "Protective cap and guard\nEngineered details\nControlled contact",
            "Capot et garde de protection\nDes détails étudiés\nUn contact maîtrisé",
            "غطاء وحاجز واقيان\nتفاصيل مدروسة\nتلامس متحكم به",
          ),
          side: "bottom",
          from: 64,
          to: 82,
        },
      ],
    }),
    section("home", "brand_rail", {
      eyebrow: L("Portfolio", "Portefeuille", "العلامات"),
      title: L("Select a brand", "Choisir une marque", "اختر علامة"),
      subtitle: {},
      limit: 0,
    }),
    section(
      "home",
      "rich_text",
      {
        eyebrow: L("The GOODMAX story", "L'histoire GOODMAX", "قصة GOODMAX"),
        title: L("Built around a precise everyday shave.", "Pensé pour un rasage précis au quotidien.", "مصمم لحلاقة يومية دقيقة."),
        body: PH,
        link_label: L("About GOODMAX", "À propos de GOODMAX", "عن GOODMAX"),
        link_url: "/about",
      },
      { placeholder: true },
    ),
    section(
      "home",
      "timeline",
      {
        eyebrow: L("Milestones", "Étapes", "محطات"),
        title: L("Our journey", "Notre parcours", "مسيرتنا"),
        items: milestones(),
      },
      { placeholder: true },
    ),
    section("home", "network", {
      eyebrow: L("Distribution network", "Réseau de distribution", "شبكة التوزيع"),
      title: L("Building coverage across Algeria.", "Une couverture en construction à travers l'Algérie.", "نبني تغطية عبر الجزائر."),
      body: L(
        "Our target is a distribution presence in every wilaya. Find a point of sale near you, or apply to become a distributor.",
        "Notre objectif : une présence dans chaque wilaya. Trouvez un point de vente proche de vous ou devenez distributeur.",
        "هدفنا حضور في كل ولاية. ابحث عن نقطة بيع قريبة منك أو قدّم طلبك لتصبح موزعاً.",
      ),
      stat_value: String(WILAYA_TARGET),
      stat_label: L("wilayas targeted", "wilayas visées", "ولاية مستهدفة"),
      cta_primary_label: L("View locations", "Voir les points de vente", "عرض المواقع"),
      cta_primary_url: "/locations",
      cta_secondary_label: L("Become a distributor", "Devenir distributeur", "كن موزعاً"),
      cta_secondary_url: "/distributors",
    }),
    section("home", "distributor_cta", {
      eyebrow: L("Partnership", "Partenariat", "شراكة"),
      title: L("Bring GOODMAX to your market.", "Apportez GOODMAX sur votre marché.", "اجلب GOODMAX إلى سوقك."),
      body: L(
        "Tell us about your company and the wilaya you cover. Our team reviews every request.",
        "Présentez votre entreprise et la wilaya que vous couvrez. Notre équipe étudie chaque demande.",
        "عرّفنا بشركتك والولاية التي تغطيها. يراجع فريقنا كل طلب.",
      ),
      cta_label: L("Apply as a distributor", "Postuler comme distributeur", "قدّم طلب توزيع"),
      cta_url: "/distributors",
    }),

    /* ---------------- ABOUT ---------------- */
    section(
      "about",
      "hero",
      {
        eyebrow: L("About", "À propos", "من نحن"),
        title: L("About GOODMAX", "À propos de GOODMAX", "عن GOODMAX"),
        subtitle: PH,
        media_url: "/media/still-blade-closeup.jpg",
        media_type: "image",
      },
      { placeholder: true },
    ),
    section(
      "about",
      "rich_text",
      {
        eyebrow: L("Company story", "Notre histoire", "قصة الشركة"),
        title: L("Our story", "Notre histoire", "قصتنا"),
        body: PH,
        link_label: {},
        link_url: "",
      },
      { placeholder: true },
    ),
    section(
      "about",
      "timeline",
      {
        eyebrow: L("Milestones", "Étapes", "محطات"),
        title: L("Our journey", "Notre parcours", "مسيرتنا"),
        items: milestones(),
      },
      { placeholder: true },
    ),
    section(
      "about",
      "values",
      {
        eyebrow: L("What drives us", "Ce qui nous anime", "ما يحركنا"),
        title: L("Mission, vision and values", "Mission, vision et valeurs", "المهمة والرؤية والقيم"),
        items: [
          { label: L("01", "01", "01"), title: L("Mission", "Mission", "المهمة"), body: PH },
          { label: L("02", "02", "02"), title: L("Vision", "Vision", "الرؤية"), body: PH },
          { label: L("03", "03", "03"), title: L("Values", "Valeurs", "القيم"), body: PH },
        ],
      },
      { placeholder: true },
    ),
    section("about", "network", {
      eyebrow: L("Coverage", "Couverture", "التغطية"),
      title: L("An ambition for every wilaya.", "Une ambition pour chaque wilaya.", "طموح لكل ولاية."),
      body: L(
        "We are building a distributor network with the goal of reaching all 69 wilayas.",
        "Nous construisons un réseau de distributeurs avec l'objectif d'atteindre les 69 wilayas.",
        "نبني شبكة موزعين بهدف الوصول إلى الولايات الـ69.",
      ),
      stat_value: String(WILAYA_TARGET),
      stat_label: L("wilayas targeted", "wilayas visées", "ولاية مستهدفة"),
      cta_primary_label: L("Become a distributor", "Devenir distributeur", "كن موزعاً"),
      cta_primary_url: "/distributors",
      cta_secondary_label: {},
      cta_secondary_url: "",
    }),

    /* ---------------- BRANDS ---------------- */
    section("brands", "hero", {
      eyebrow: L("Brands", "Marques", "العلامات"),
      title: L("Our brands", "Nos marques", "علاماتنا"),
      subtitle: L("Select a brand to see its products.", "Choisissez une marque pour voir ses produits.", "اختر علامة لعرض منتجاتها."),
      media_url: "",
      media_type: "none",
    }),
    section("brands", "brand_rail", { eyebrow: {}, title: {}, subtitle: {}, limit: 0 }),
    section("brands", "distributor_cta", {
      eyebrow: L("Partnership", "Partenariat", "شراكة"),
      title: L("Distribute our brands.", "Distribuez nos marques.", "وزّع علاماتنا."),
      body: {},
      cta_label: L("Apply as a distributor", "Postuler comme distributeur", "قدّم طلب توزيع"),
      cta_url: "/distributors",
    }),

    /* ---------------- PRODUCTS ---------------- */
    section("products", "hero", {
      eyebrow: L("Products", "Produits", "المنتجات"),
      title: L("Engineered details.", "Des détails étudiés.", "تفاصيل مدروسة."),
      subtitle: L("Real products, real characteristics.", "De vrais produits, de vraies caractéristiques.", "منتجات حقيقية وخصائص حقيقية."),
      media_url: "",
      media_type: "none",
    }),
    section("products", "product_grid", { eyebrow: {}, title: {}, subtitle: {}, limit: 0 }),

    /* ---------------- DISTRIBUTORS ---------------- */
    section("distributors", "hero", {
      eyebrow: L("Distributors", "Distributeurs", "الموزعون"),
      title: L("Bring GOODMAX to your market.", "Apportez GOODMAX sur votre marché.", "اجلب GOODMAX إلى سوقك."),
      subtitle: L(
        "Complete the form and our team will get back to you.",
        "Remplissez le formulaire, notre équipe vous recontactera.",
        "املأ الاستمارة وسيتواصل معك فريقنا.",
      ),
      media_url: "",
      media_type: "none",
    }),
    section("distributors", "distributor_form", {
      eyebrow: L("Application", "Candidature", "الطلب"),
      title: L("Distributor application", "Demande de distribution", "طلب توزيع"),
      body: L(
        "Fields marked optional can be left empty.",
        "Les champs indiqués comme facultatifs peuvent rester vides.",
        "يمكن ترك الحقول الاختيارية فارغة.",
      ),
      success_text: L(
        "Thank you. Your request has been received and our team will contact you.",
        "Merci. Votre demande a bien été reçue, notre équipe vous contactera.",
        "شكراً لك. تم استلام طلبك وسيتواصل معك فريقنا.",
      ),
    }),

    /* ---------------- LOCATIONS ---------------- */
    section("locations", "network", {
      eyebrow: L("Locations", "Points de vente", "المواقع"),
      title: L("Find GOODMAX near you.", "Trouvez GOODMAX près de chez vous.", "اعثر على GOODMAX بالقرب منك."),
      body: L(
        "Our network is growing toward all 69 wilayas.",
        "Notre réseau s'étend vers les 69 wilayas.",
        "شبكتنا تتوسع نحو الولايات الـ69.",
      ),
      stat_value: String(WILAYA_TARGET),
      stat_label: L("wilayas targeted", "wilayas visées", "ولاية مستهدفة"),
      cta_primary_label: L("Become a distributor", "Devenir distributeur", "كن موزعاً"),
      cta_primary_url: "/distributors",
      cta_secondary_label: {},
      cta_secondary_url: "",
    }),
    section("locations", "locations_list", {
      eyebrow: L("Network", "Réseau", "الشبكة"),
      title: L("Distributors and points of sale", "Distributeurs et points de vente", "الموزعون ونقاط البيع"),
      body: {},
      empty_text: L(
        "Locations will be published here soon.",
        "Les points de vente seront bientôt publiés ici.",
        "سيتم نشر المواقع هنا قريباً.",
      ),
    }),

    /* ---------------- CONTACT ---------------- */
    section("contact", "hero", {
      eyebrow: L("Contact", "Contact", "اتصل بنا"),
      title: L("Talk to GOODMAX.", "Parlez à GOODMAX.", "تحدث إلى GOODMAX."),
      subtitle: L(
        "General questions, distribution or partnerships: send us a message.",
        "Questions générales, distribution ou partenariats : écrivez-nous.",
        "أسئلة عامة أو توزيع أو شراكات: راسلنا.",
      ),
      media_url: "",
      media_type: "none",
    }),
    section("contact", "contact_block", {
      eyebrow: {},
      title: L("Get in touch", "Nous contacter", "تواصل معنا"),
      body: {},
      show_form: true,
      show_map: true,
      show_socials: true,
    }),
  ];
}

function milestones() {
  const body = L("Milestone details to be added.", "Détails de l'étape à ajouter.", "تفاصيل المحطة ستضاف لاحقاً.");
  const title = L("Milestone title", "Titre de l'étape", "عنوان المحطة");
  return [
    { year: L("2017", "2017", "2017"), title, body, visible: true },
    { year: L("2020", "2020", "2020"), title, body, visible: true },
    { year: L("2023", "2023", "2023"), title, body, visible: true },
    { year: L("Now", "Aujourd'hui", "اليوم"), title, body, visible: true },
  ];
}

function brands(): Brand[] {
  const base = (i: number, slug: string, name: LocalizedText, accent: string, placeholder: boolean, bg: string): Brand => {
    const content = {
      slug,
      name_json: name,
      description_json: placeholder
        ? L("Demo brand — rename or delete in Admin › Brands.", "Marque de démonstration — à renommer ou supprimer dans Admin › Marques.", "علامة تجريبية — أعد تسميتها أو احذفها من الإدارة › العلامات.")
        : L("Brand description to be added.", "Description de la marque à ajouter.", "وصف العلامة سيضاف لاحقاً."),
      cta_json: L("View products", "Voir les produits", "عرض المنتجات"),
      logo_url: `/media/brands/${slug}.png`,
      accent_color: accent,
      background_url: bg,
    };
    return {
      id: `brand-${slug}`,
      ...content,
      visible: true,
      sort_order: i,
      published_snapshot: JSON.parse(JSON.stringify(content)),
      published_at: now(),
      updated_at: now(),
      updated_by: "seed",
      is_placeholder: true,
    };
  };
  // real brand names and logos supplied by GOODMAX (descriptions still to come)
  return [
    base(1, "vistar-bouti", L("Vistar BouTi", "Vistar BouTi", "Vistar BouTi"), "#072f54", false, ""),
    base(2, "goodmax-x", L("GoodMax", "GoodMax", "GoodMax"), "#072f54", false, ""),
    base(3, "goodmax", L("GOODMAX", "GOODMAX", "قود ماكس"), "#072f54", false, "/media/still-razor-front.jpg"),
    base(4, "super-goodmax", L("Super GoodMax", "Super GoodMax", "Super GoodMax"), "#072f54", false, ""),
    base(5, "b7b", L("B7B", "B7B", "B7B"), "#072f54", false, ""),
    base(6, "alg-max", L("ALG MAX", "ALG MAX", "ALG MAX"), "#072f54", false, ""),
    base(7, "glasmax", L("GLASMAX", "GLASMAX", "GLASMAX"), "#072f54", false, ""),
    base(8, "darcon", L("DARCON", "DARCON", "DARCON"), "#072f54", false, ""),
    base(9, "big-one", L("BIG ONE", "BIG ONE", "بيق وان"), "#072f54", false, ""),
  ];
}

function products(): Product[] {
  const content = {
    brand_id: "brand-goodmax",
    slug: "goodmax-razor",
    name_json: L("GOODMAX razor", "Rasoir GOODMAX", "شفرة حلاقة GOODMAX"),
    short_description_json: L(
      "Product name and description to be confirmed by GOODMAX.",
      "Nom et description du produit à confirmer par GOODMAX.",
      "اسم المنتج ووصفه بانتظار تأكيد GOODMAX.",
    ),
    description_json: {},
    cta_json: L("Find a distributor", "Trouver un distributeur", "ابحث عن موزع"),
    cta_url: "/locations",
    features: [
      { id: "f1", label_json: L("01", "01", "01"), title_json: L("Six precision blades", "Six lames de précision", "ست شفرات دقيقة"), body_json: L("Multi-blade geometry for a close, consistent path.", "Géométrie multi-lames pour un passage proche et régulier.", "هندسة متعددة الشفرات لمسار قريب ومنتظم."), visible: true },
      { id: "f2", label_json: L("02", "02", "02"), title_json: L("Comfort strip", "Bande de confort", "شريط الراحة"), body_json: L("Smoother glide, controlled movement.", "Une glisse plus douce, un mouvement maîtrisé.", "انزلاق أكثر سلاسة وحركة متحكم بها."), visible: true },
      { id: "f3", label_json: L("03", "03", "03"), title_json: L("Soft-touch grip", "Prise soft-touch", "مقبض ناعم الملمس"), body_json: L("Balanced handling, confident control.", "Prise en main équilibrée, contrôle assuré.", "توازن في الاستخدام وتحكم بثقة."), visible: true },
      { id: "f4", label_json: L("04", "04", "04"), title_json: L("Protective architecture", "Architecture protectrice", "بنية واقية"), body_json: L("Protective cap and guard, controlled contact.", "Capot et garde de protection, contact maîtrisé.", "غطاء وحاجز واقيان وتلامس متحكم به."), visible: true },
    ],
    media: [
      { id: "m1", media_type: "image" as const, url: "/media/still-razor-front.jpg", alt_json: L("GOODMAX razor, front view", "Rasoir GOODMAX, vue de face", "شفرة GOODMAX، منظر أمامي"), is_primary: true },
      { id: "m2", media_type: "image" as const, url: "/media/still-razor-back.jpg", alt_json: L("GOODMAX razor, back view", "Rasoir GOODMAX, vue arrière", "شفرة GOODMAX، منظر خلفي"), is_primary: false },
      { id: "m3", media_type: "image" as const, url: "/media/still-blade-closeup.jpg", alt_json: L("Blade cartridge close-up", "Gros plan sur la cartouche", "لقطة قريبة للشفرات"), is_primary: false },
      { id: "m4", media_type: "video" as const, url: "/media/product-scroll-720.mp4", alt_json: L("Product video", "Vidéo du produit", "فيديو المنتج"), is_primary: false },
    ],
    seo_json: {},
  };
  return [
    {
      id: "product-goodmax-razor",
      ...content,
      visible: true,
      sort_order: 1,
      published_snapshot: JSON.parse(JSON.stringify(content)),
      published_at: now(),
      updated_at: now(),
      updated_by: "seed",
      is_placeholder: true,
    },
  ];
}

function pages(): Page[] {
  const t: [Page["slug"], LocalizedText][] = [
    ["home", L("Home", "Accueil", "الرئيسية")],
    ["about", L("About", "À propos", "من نحن")],
    ["brands", L("Brands", "Marques", "العلامات")],
    ["products", L("Products", "Produits", "المنتجات")],
    ["distributors", L("Distributors", "Distributeurs", "الموزعون")],
    ["locations", L("Locations", "Points de vente", "المواقع")],
    ["contact", L("Contact", "Contact", "اتصل بنا")],
  ];
  return t.map(([slug, title_json], i) => ({ id: `page-${slug}`, slug, title_json, sort_order: i }));
}

function seo(): SeoEntry[] {
  const routes: [string, LocalizedText, LocalizedText][] = [
    ["/", L("GOODMAX — Precision shaving", "GOODMAX — Rasage de précision", "GOODMAX — حلاقة دقيقة"), L("Discover GOODMAX products and our distribution network across Algeria.", "Découvrez les produits GOODMAX et notre réseau de distribution en Algérie.", "اكتشف منتجات GOODMAX وشبكة التوزيع عبر الجزائر.")],
    ["/about", L("About GOODMAX", "À propos de GOODMAX", "عن GOODMAX"), L("The GOODMAX story, milestones and values.", "L'histoire, les étapes et les valeurs de GOODMAX.", "قصة GOODMAX ومحطاتها وقيمها.")],
    ["/brands", L("Brands — GOODMAX", "Marques — GOODMAX", "العلامات — GOODMAX"), L("Explore the GOODMAX brand portfolio.", "Explorez le portefeuille de marques GOODMAX.", "استكشف علامات GOODMAX.")],
    ["/products", L("Products — GOODMAX", "Produits — GOODMAX", "المنتجات — GOODMAX"), L("GOODMAX products and their characteristics.", "Les produits GOODMAX et leurs caractéristiques.", "منتجات GOODMAX وخصائصها.")],
    ["/distributors", L("Become a distributor — GOODMAX", "Devenir distributeur — GOODMAX", "كن موزعاً — GOODMAX"), L("Apply to distribute GOODMAX in your wilaya.", "Postulez pour distribuer GOODMAX dans votre wilaya.", "قدّم طلبك لتوزيع GOODMAX في ولايتك.")],
    ["/locations", L("Locations — GOODMAX", "Points de vente — GOODMAX", "المواقع — GOODMAX"), L("Find GOODMAX distributors and points of sale.", "Trouvez les distributeurs et points de vente GOODMAX.", "اعثر على موزعي ونقاط بيع GOODMAX.")],
    ["/contact", L("Contact — GOODMAX", "Contact — GOODMAX", "اتصل بنا — GOODMAX"), L("Contact the GOODMAX team.", "Contactez l'équipe GOODMAX.", "تواصل مع فريق GOODMAX.")],
  ];
  return routes.map(([route, title_json, description_json]) => ({
    id: `seo-${route === "/" ? "home" : route.slice(1)}`,
    route,
    title_json,
    description_json,
    image_url: "/media/product-scroll-poster.jpg",
    canonical_url: "",
    robots: "index,follow",
    in_sitemap: true,
  }));
}

function socials(): SocialLink[] {
  return (["instagram", "facebook", "tiktok", "linkedin", "youtube"] as const).map((platform, i) => ({
    id: `social-${platform}`,
    platform,
    label: "",
    url: "",
    visible: false,
    sort_order: i,
  }));
}

function pixels(): MarketingPixel[] {
  return (["meta", "tiktok", "snapchat", "ga4", "gtm"] as const).map((provider) => ({
    id: `pixel-${provider}`,
    provider,
    pixel_id: "",
    enabled: false,
    production_only: true,
    configuration_json: {},
  }));
}

function media(): MediaItem[] {
  const files: [string, string, number, LocalizedText][] = [
    ["goodmax-logo.png", "image/png", 23321, L("GOODMAX logo", "Logo GOODMAX", "شعار GOODMAX")],
    ["goodmax-logo-white.png", "image/png", 21637, L("GOODMAX logo (white)", "Logo GOODMAX (blanc)", "شعار GOODMAX (أبيض)")],
    ["product-scroll.mp4", "video/mp4", 10830888, L("Product scroll video", "Vidéo produit", "فيديو المنتج")],
    ["product-scroll-720.mp4", "video/mp4", 4055070, L("Product scroll video (mobile)", "Vidéo produit (mobile)", "فيديو المنتج (جوال)")],
    ["product-scroll-poster.jpg", "image/jpeg", 39497, L("GOODMAX razor on a dark blue background", "Rasoir GOODMAX sur fond bleu nuit", "شفرة GOODMAX على خلفية زرقاء داكنة")],
    ["product-scroll-poster-mobile.jpg", "image/jpeg", 10101, L("GOODMAX razor on a dark blue background", "Rasoir GOODMAX sur fond bleu nuit", "شفرة GOODMAX على خلفية زرقاء داكنة")],
    ["still-razor-front.jpg", "image/jpeg", 25826, L("GOODMAX razor, front view", "Rasoir GOODMAX, vue de face", "شفرة GOODMAX، منظر أمامي")],
    ["still-razor-back.jpg", "image/jpeg", 26370, L("GOODMAX razor, back view", "Rasoir GOODMAX, vue arrière", "شفرة GOODMAX، منظر خلفي")],
    ["still-blade-closeup.jpg", "image/jpeg", 62366, L("Blade cartridge close-up", "Gros plan sur la cartouche", "لقطة قريبة للشفرات")],
    ["still-cartridge.jpg", "image/jpeg", 50901, L("Cartridge and pivot", "Cartouche et pivot", "الرأس والمفصل")],
  ];
  return files.map(([file_name, mime_type, size_bytes, alt_json]) => ({
    id: `media-${file_name}`,
    file_name,
    storage_path: `bundled/${file_name}`,
    public_url: `/media/${file_name}`,
    mime_type,
    size_bytes,
    alt_json,
    created_at: now(),
    bundled: true,
  }));
}

export interface Database {
  collections: { [K in keyof Collections]: Collections[K][] };
  settings: Partial<SiteSettingsMap>;
}

export function buildSeed(): Database {
  return {
    collections: {
      profiles: [],
      pages: pages(),
      page_sections: sections(),
      brands: brands(),
      products: products(),
      distributor_requests: [],
      contact_messages: [],
      locations: [],
      social_links: socials(),
      media_library: media(),
      seo_entries: seo(),
      marketing_pixels: pixels(),
      wilayas: seedWilayas(),
      audit_log: [],
    },
    settings: {},
  };
}
