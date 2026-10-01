import type { PageSlug } from "@/types/content";
import { getSections } from "@/lib/content/queries";
import { SectionRenderer } from "./SectionRenderer";

export async function PageSections({ slug, searchParams }: { slug: PageSlug; searchParams?: Record<string, string | undefined> }) {
  const sections = await getSections(slug);
  const firstIsFullBleed = sections[0]?.section_type === "video_story" || sections[0]?.section_type === "hero";
  return (
    <div className={firstIsFullBleed ? undefined : "page-offset"}>
      {sections.map((s, i) => (
        <SectionRenderer key={s.id} section={s} index={i} searchParams={searchParams} />
      ))}
    </div>
  );
}
