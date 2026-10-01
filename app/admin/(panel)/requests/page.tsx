import { db } from "@/lib/data";
import { loc } from "@/lib/i18n";
import { Inbox } from "@/components/admin/Inbox";

export default async function Requests({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const [requests, messages, wilayas] = await Promise.all([db().list("distributor_requests"), db().list("contact_messages"), db().list("wilayas")]);
  return (
    <Inbox
      tab={sp.tab === "messages" ? "messages" : "requests"}
      requests={requests}
      messages={messages}
      wilayas={wilayas.map((w) => ({ id: w.id, label: `${String(w.code).padStart(2, "0")} ${loc(w.name_json, "fr") || "(pending)"}` }))}
    />
  );
}
