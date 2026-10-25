import { requireUser } from "@/lib/auth/session";
import { getConnection, listUsers } from "@/lib/zoho/mail";
import { MailError, MailFrame } from "@/components/admin/MailFrame";
import { MailAddresses } from "@/components/admin/MailClient";

export default async function MailAddressesPage() {
  await requireUser("mail.manage");
  return (
    <MailFrame active="addresses">
      <Addresses />
    </MailFrame>
  );
}

async function Addresses() {
  try {
    const [users, conn] = await Promise.all([listUsers(), getConnection()]);
    const domain = (conn?.email.split("@")[1] || "goodmaxdz.com").toLowerCase();
    return (
      <>
        <p className="muted" style={{ marginTop: 0 }}>
          The Inbox tab shows the mail of {conn?.email || "the connected mailbox"}, including every address added to it. Other mailboxes are read by their owners at
          mail.zoho.com.
        </p>
        <MailAddresses users={users} domain={domain} />
      </>
    );
  } catch (e) {
    return <MailError error={e} />;
  }
}
