import { PageSections } from "@/components/sections/PageSections";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

/** The maker's page (Vistar-Bouti), opened from its logo in the footer. */
export const generateMetadata = async ({ params }: Props) => buildMetadata("/group", (await params).locale);

export default async function Page({ params }: Props) {
  return <PageSections slug="group" bucket={(await params).locale} />;
}
