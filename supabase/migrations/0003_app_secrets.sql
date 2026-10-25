-- Server-only secrets (e.g. the Zoho Mail connection behind Admin › Mail), stored encrypted by the app.
-- Row level security is on with no policies, so only the service role (the site's server) can read or write.
create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
