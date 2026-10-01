import { PageSections } from "@/components/sections/PageSections";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => buildMetadata("/contact");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PageSections slug="contact" searchParams={await searchParams} />;
}
