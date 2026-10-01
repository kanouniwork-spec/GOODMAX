import { db } from "@/lib/data";
import { PAGE_SLUGS, type PageSlug } from "@/types/content";
import { SECTION_DEFINITIONS } from "@/lib/sections/schema";
import { publishInfo } from "@/lib/admin/info";
import { loc } from "@/lib/i18n";
import { PageBuilder } from "@/components/admin/PageBuilder";

export default async function Pages({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = ((PAGE_SLUGS as readonly string[]).includes(sp.page ?? "") ? sp.page : "home") as PageSlug;
  const [pages, sections] = await Promise.all([db().list("pages"), db().list("page_sections")]);
  const list = sections
    .filter((s) => s.page_slug === page)
    .map((s) => {
      const info = publishInfo("page_sections", s as never);
      const c = s.content_json as Record<string, unknown>;
      return {
        id: s.id,
        type: s.section_type,
        name: SECTION_DEFINITIONS[s.section_type]?.name ?? s.section_type,
        title: loc((c.title ?? c.intro_caption) as never, "en"),
        visible: s.visible,
        placeholder: !!s.is_placeholder,
        published: info.published,
        changed: info.changed,
        status: info.status,
      };
    });
  return (
    <PageBuilder
      page={page}
      pages={pages.map((p) => ({ slug: p.slug, title: loc(p.title_json, "en") }))}
      sections={list}
      types={Object.values(SECTION_DEFINITIONS).map((d) => ({ type: d.type, name: d.name, description: d.description, disabled: !!d.singleton && list.some((s) => s.type === d.type) }))}
    />
  );
}
