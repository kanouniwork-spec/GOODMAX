import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/data";
import { PixelsAdmin } from "@/components/admin/PixelsAdmin";

export default async function Pixels() {
  await requireUser("read");
  return <PixelsAdmin pixels={await db().list("marketing_pixels")} />;
}
