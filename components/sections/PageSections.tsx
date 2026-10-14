import type { PageSlug } from "@/types/content";
import { getSections } from "@/lib/content/queries";
import { SectionRenderer } from "./SectionRenderer";

/** `bucket` is the page's language (see lib/i18n/server.ts); `brand` filters the product list. */
export async function PageSections({ slug, bucket, brand }: { slug: PageSlug; bucket: string; brand?: string }) {
  const sections = await getSections(slug);
  const firstIsFullBleed = sections[0]?.section_type === "video_story" || sections[0]?.section_type === "hero";
  return (
    <div className={firstIsFullBleed ? undefined : "page-offset"}>
      {sections.map((s, i) => (
        <SectionRenderer key={s.id} section={s} index={i} bucket={bucket} brand={brand} />
      ))}
    </div>
  );
}
