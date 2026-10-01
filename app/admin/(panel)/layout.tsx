import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { db } from "@/lib/data";
import { AdminProviders, MediaListProvider } from "@/components/admin/ui";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function Panel({ children }: { children: React.ReactNode }) {
  const user = await requireUser("read");
  const [requests, messages, media] = await Promise.all([db().list("distributor_requests"), db().list("contact_messages"), db().list("media_library")]);
  const newCount = requests.filter((r) => r.status === "new").length + messages.filter((m) => m.status === "new").length;
  const store = db();
  return (
    <AdminProviders canTranslate={!!process.env.ANTHROPIC_API_KEY} readOnly={!can(user.role, "content.write")}>
      <MediaListProvider media={media}>
        <div className="a-shell">
          <aside className="a-side">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/goodmax-logo-white.png" alt="GOODMAX" width={132} height={30} />
            <AdminNav newRequests={newCount} role={user.role} />
            <div className="a-user">
              <b>{user.full_name || user.email}</b>
              <small>
                {user.email} · {user.role}
              </small>
              <small>Storage: {store.kind === "supabase" ? "Supabase" : store.ephemeral ? "temporary demo" : "local file"}</small>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <a className="a-btn a-btn--sm" href="/" target="_blank" rel="noreferrer">
                  View site
                </a>
                <form action={logoutAction}>
                  <button className="a-btn a-btn--sm">Log out</button>
                </form>
              </div>
            </div>
          </aside>
          <main className="a-main">
            {store.ephemeral && (
              <div className="a-alert">
                Demo storage: this preview keeps changes only temporarily. Connect Supabase (see README) to make every save permanent.
              </div>
            )}
            {children}
          </main>
        </div>
      </MediaListProvider>
    </AdminProviders>
  );
}
