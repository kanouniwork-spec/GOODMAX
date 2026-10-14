import { PageSections } from "@/components/sections/PageSections";
import { view } from "@/lib/content/publish";
import { db } from "@/lib/data";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; brand: string }> };

/** /products?brand=… lands here (see middleware.ts), so each brand's list is kept ready like any other page. */
export async function generateStaticParams() {
  const live = (await db().list("brands")).filter((b) => b.visible).map((b) => view("brands", b, false));
  return live.flatMap((b) => (b ? [{ brand: b.slug }] : []));
}

export const generateMetadata = async ({ params }: Props) => buildMetadata("/products", (await params).locale);

export default async function Page({ params }: Props) {
  const { locale, brand } = await params;
  return <PageSections slug="products" bucket={locale} brand={brand} />;
}
