import { db } from "@/lib/data";
import { SeoAdmin } from "@/components/admin/SeoAdmin";

export default async function Seo() {
  return <SeoAdmin entries={await db().list("seo_entries")} />;
}
