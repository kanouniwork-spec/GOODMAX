import { PageSections } from "@/components/sections/PageSections";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => buildMetadata("/about");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PageSections slug="about" searchParams={await searchParams} />;
}
