import { db } from "@/lib/data";
import { AppearancePage } from "@/components/admin/AppearancePage";

export default async function Appearance() {
  return <AppearancePage initial={await db().getSetting("appearance")} />;
}
