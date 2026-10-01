import { db } from "@/lib/data";
import { SocialsEditor } from "@/components/admin/SocialsEditor";

export default async function Socials() {
  return <SocialsEditor links={await db().list("social_links")} />;
}
