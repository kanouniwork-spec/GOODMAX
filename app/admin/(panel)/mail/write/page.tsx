import { requireUser } from "@/lib/auth/session";
import { listAccounts } from "@/lib/zoho/mail";
import { MailError, MailFrame } from "@/components/admin/MailFrame";
import { MailCompose } from "@/components/admin/MailClient";

export default async function MailWrite({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("mail.manage");
  const sp = await searchParams;
  return (
    <MailFrame active="write">
      <Write to={typeof sp.to === "string" ? sp.to.slice(0, 300) : ""} />
    </MailFrame>
  );
}

async function Write({ to }: { to: string }) {
  try {
    const accounts = await listAccounts();
    const from = [...new Set(accounts.flatMap((a) => a.from))];
    if (!from.length) return <div className="a-alert">Zoho returned no address this sign-in may send from.</div>;
    return (
      <>
        <p className="muted" style={{ marginTop: 0 }}>
          Sent mail is kept in the Sent folder of the mailbox it is sent from.
        </p>
        <MailCompose fromOptions={from} initial={{ to }} />
      </>
    );
  } catch (e) {
    return <MailError error={e} />;
  }
}
