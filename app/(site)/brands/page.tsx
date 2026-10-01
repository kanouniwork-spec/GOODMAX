import { PageSections } from "@/components/sections/PageSections";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => buildMetadata("/brands");

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PageSections slug="brands" searchParams={await searchParams} />;
}
