import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/data";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { ROLE_DESCRIPTIONS } from "@/lib/auth/permissions";

export default async function Users() {
  const me = await requireUser("users.manage");
  const users = (await db().list("profiles")).map((u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, active: u.active, created_at: u.created_at }));
  return <UsersAdmin users={users} me={me.id} roles={ROLE_DESCRIPTIONS} />;
}
