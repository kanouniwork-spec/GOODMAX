import { requireUser } from "@/lib/auth/session";
import { listUsers } from "@/lib/zoho/mail";
import { MailError, MailFrame, type SP } from "@/components/admin/MailFrame";
import { MailAddresses } from "@/components/admin/MailClient";

export default async function MailAddressesPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("mail.manage");
  const sp = await searchParams;
  return (
    <MailFrame sp={sp} active="addresses">
      {(box) => <Addresses email={box.conn.email || box.account.email} />}
    </MailFrame>
  );
}

async function Addresses({ email }: { email: string }) {
  try {
    const users = await listUsers();
    const domain = (email.split("@")[1] || "goodmaxdz.com").toLowerCase();
    return (
      <section className="mx-card">
        <div className="mx-toolbar">
          <h2>Addresses</h2>
        </div>
        <div className="mx-pad">
          <p className="mx-lead">
            The inbox here shows the mail of {email || "the connected mailbox"}, including every address added to it. Other mailboxes are read by their owners at
            mail.zoho.com.
          </p>
          <MailAddresses users={users} domain={domain} />
        </div>
      </section>
    );
  } catch (e) {
    return <MailError error={e} />;
  }
}
