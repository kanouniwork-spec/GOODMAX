import { PageSections } from "@/components/sections/PageSections";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = async ({ params }: Props) => buildMetadata("/products", (await params).locale);

export default async function Page({ params }: Props) {
  return <PageSections slug="products" bucket={(await params).locale} />;
}
