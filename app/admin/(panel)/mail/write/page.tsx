import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

/** Old address of the Write tab: new mail now opens in the pop-up window over the inbox. */
export default async function MailWrite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("mail.manage");
  const to = (await searchParams).to;
  redirect(`/admin/mail?${new URLSearchParams({ compose: "1", ...(typeof to === "string" ? { to: to.slice(0, 300) } : {}) })}`);
}
