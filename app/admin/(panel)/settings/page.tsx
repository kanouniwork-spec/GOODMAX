import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/data";
import { SettingsPage } from "@/components/admin/SettingsPage";

export default async function Settings() {
  await requireUser("read");
  const [general, footer, consent] = await Promise.all([db().getSetting("general"), db().getSetting("footer"), db().getSetting("consent")]);
  return <SettingsPage general={general} footer={footer} consent={consent} />;
}
