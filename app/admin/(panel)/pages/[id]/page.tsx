import { notFound } from "next/navigation";
import { db } from "@/lib/data";
import { SectionEditor } from "@/components/admin/SectionEditor";
import { SECTION_DEFINITIONS } from "@/lib/sections/schema";
import { publishInfo } from "@/lib/admin/info";

const ROUTE: Record<string, string> = { home: "/", about: "/about", brands: "/brands", products: "/products", distributors: "/distributors", locations: "/locations", contact: "/contact" };

export default async function EditSection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await db().get("page_sections", id);
  if (!s) notFound();
  const def = SECTION_DEFINITIONS[s.section_type];
  return (
    <SectionEditor
      id={id}
      page={s.page_slug}
      name={def.name}
      description={def.description}
      fields={def.fields}
      content={s.content_json}
      info={publishInfo("page_sections", s as never)}
      route={ROUTE[s.page_slug]}
    />
  );
}

