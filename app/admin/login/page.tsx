import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { backend } from "@/lib/data";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function Login() {
  if (await currentUser()) redirect("/admin");
  return (
    <div className="a-login">
      <LoginForm hint={backend() === "file" ? "Local mode: the first admin password is in .data/initial-admin.txt or ADMIN_BOOTSTRAP_PASSWORD." : undefined} />
    </div>
  );
}
