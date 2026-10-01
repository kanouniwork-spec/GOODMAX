/**
 * One-time setup for a fresh Supabase project (after running the migration):
 *   npx tsx scripts/seed-supabase.ts
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD.
 * Inserts the seed content (skipping tables that already have rows) and creates the first admin.
 */
import { createClient } from "@supabase/supabase-js";
import { buildSeed } from "../data/seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
const sb = createClient(url, key, { auth: { persistSession: false } });

// insertion order respects foreign keys
const ORDER = ["pages", "page_sections", "brands", "products", "wilayas", "social_links", "media_library", "seo_entries", "marketing_pixels"] as const;

async function main() {
  const seed = buildSeed();
  for (const table of ORDER) {
    const { count } = await sb.from(table).select("*", { count: "exact", head: true });
    if (count) {
      console.log(`skip ${table} (${count} rows already)`);
      continue;
    }
    const rows = seed.collections[table] as unknown[];
    if (!rows.length) continue;
    const { error } = await sb.from(table).insert(rows as never);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`seeded ${table}: ${rows.length}`);
  }
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (email && password) {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error && !/already/i.test(error.message)) throw error;
    const id = data?.user?.id ?? (await sb.auth.admin.listUsers()).data.users.find((u) => u.email === email)?.id;
    if (id) {
      await sb.from("profiles").upsert({ id, email, full_name: "Administrator", role: "admin", active: true });
      console.log(`admin ready: ${email}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
