import { PageSections } from "@/components/sections/PageSections";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const generateMetadata = () => buildMetadata("/");

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return <PageSections slug="home" searchParams={await searchParams} />;
}
