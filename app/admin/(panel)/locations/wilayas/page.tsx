import { db } from "@/lib/data";
import { WilayaEditor } from "@/components/admin/WilayaEditor";

export default async function Wilayas() {
  const [wilayas, general] = await Promise.all([db().list("wilayas"), db().getSetting("general")]);
  return <WilayaEditor wilayas={wilayas} target={general.wilaya_target} />;
}
