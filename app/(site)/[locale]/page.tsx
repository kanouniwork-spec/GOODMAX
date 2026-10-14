import { PageSections } from "@/components/sections/PageSections";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props) => buildMetadata("/", (await params).locale);

export default async function Home({ params }: Props) {
  return <PageSections slug="home" bucket={(await params).locale} />;
}
