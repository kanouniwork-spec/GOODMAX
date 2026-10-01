-- GOODMAX schema. Column names match types/content.ts one-to-one.
-- Localised fields are JSONB objects: {"en": "...", "fr": "...", "ar": "..."}.
-- The Next.js server talks to Supabase with the service-role key after its own
-- role checks; RLS below is the second line of defence for anon/authenticated keys.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.profiles (
  id text primary key,                       -- = auth.users.id
  email text not null unique,
  full_name text not null default '',
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pages (
  id text primary key,
  slug text not null unique,
  title_json jsonb not null default '{}',
  sort_order numeric not null default 0
);

create table if not exists public.page_sections (
  id text primary key default gen_random_uuid()::text,
  page_slug text not null references public.pages(slug) on update cascade,
  section_type text not null,
  content_json jsonb not null default '{}',
  visible boolean not null default true,
  sort_order numeric not null default 0,
  published_snapshot jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text,
  is_placeholder boolean not null default false
);
create index if not exists page_sections_page on public.page_sections(page_slug, sort_order);

create table if not exists public.brands (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique,
  name_json jsonb not null default '{}',
  description_json jsonb not null default '{}',
  cta_json jsonb not null default '{}',
  logo_url text not null default '',
  accent_color text not null default '#1d5bd8',
  background_url text not null default '',
  visible boolean not null default true,
  sort_order numeric not null default 0,
  published_snapshot jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text,
  is_placeholder boolean not null default false
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  brand_id text references public.brands(id) on delete set null,
  slug text not null unique,
  name_json jsonb not null default '{}',
  short_description_json jsonb not null default '{}',
  description_json jsonb not null default '{}',
  cta_json jsonb not null default '{}',
  cta_url text not null default '',
  features jsonb not null default '[]',   -- [{id,label_json,title_json,body_json,visible}]
  media jsonb not null default '[]',      -- [{id,media_type,url,alt_json,is_primary}]
  seo_json jsonb not null default '{}',
  visible boolean not null default true,
  sort_order numeric not null default 0,
  published_snapshot jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text,
  is_placeholder boolean not null default false
);

create table if not exists public.wilayas (
  id text primary key,
  code int not null unique,
  name_json jsonb not null default '{}',
  municipalities text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  active boolean not null default true
);

create table if not exists public.distributor_requests (
  id text primary key default gen_random_uuid()::text,
  full_name text not null,
  company text not null,
  city text not null,
  wilaya text not null,
  municipality text not null,
  email text not null,
  phone text not null default '',
  commercial_register text not null default '',
  interested_brand text not null default '',
  extra_json jsonb not null default '{}',
  status text not null default 'new' check (status in ('new','contacted','qualified','approved','rejected')),
  internal_notes text not null default '',
  locale text not null default 'en',
  source text not null default '',
  utm_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists distributor_requests_created on public.distributor_requests(created_at desc);

create table if not exists public.contact_messages (
  id text primary key default gen_random_uuid()::text,
  full_name text not null,
  email text not null,
  phone text not null default '',
  subject text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new','read','archived')),
  internal_notes text not null default '',
  locale text not null default 'en',
  source text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id text primary key default gen_random_uuid()::text,
  name_json jsonb not null default '{}',
  location_type text not null default 'distributor',
  wilaya text not null default '',
  municipality text not null default '',
  address_json jsonb not null default '{}',
  latitude double precision,
  longitude double precision,
  phone text not null default '',
  email text not null default '',
  maps_url text not null default '',
  hours_json jsonb not null default '{}',
  visible boolean not null default true,
  sort_order numeric not null default 0
);

create table if not exists public.social_links (
  id text primary key default gen_random_uuid()::text,
  platform text not null,
  label text not null default '',
  url text not null default '',
  visible boolean not null default false,
  sort_order numeric not null default 0
);

create table if not exists public.media_library (
  id text primary key default gen_random_uuid()::text,
  file_name text not null,
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  alt_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  bundled boolean not null default false
);

create table if not exists public.seo_entries (
  id text primary key default gen_random_uuid()::text,
  route text not null unique,
  title_json jsonb not null default '{}',
  description_json jsonb not null default '{}',
  image_url text not null default '',
  canonical_url text not null default '',
  robots text not null default 'index,follow',
  in_sitemap boolean not null default true
);

create table if not exists public.marketing_pixels (
  id text primary key default gen_random_uuid()::text,
  provider text not null unique check (provider in ('meta','tiktok','snapchat','ga4','gtm')),
  pixel_id text not null default '',
  enabled boolean not null default false,
  production_only boolean not null default true,
  configuration_json jsonb not null default '{}'
);

create table if not exists public.audit_log (
  id text primary key default gen_random_uuid()::text,
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  created_at timestamptz not null default now()
);

-- ---------- helpers (after profiles exists) ----------
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()::text and active
$$;

-- ---------- row level security ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','site_settings','pages','page_sections','brands','products','wilayas',
    'distributor_requests','contact_messages','locations','social_links','media_library','seo_entries',
    'marketing_pixels','audit_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    -- any signed-in, active admin user can read everything
    execute format('drop policy if exists admin_read on public.%I', t);
    execute format('create policy admin_read on public.%I for select to authenticated using (public.app_role() is not null)', t);
  end loop;

  -- editors and admins write content
  foreach t in array array['pages','page_sections','brands','products','wilayas','locations','social_links',
    'media_library','seo_entries','distributor_requests','contact_messages']
  loop
    execute format('drop policy if exists editor_write on public.%I', t);
    execute format('create policy editor_write on public.%I for all to authenticated using (public.app_role() in (''admin'',''editor'')) with check (public.app_role() in (''admin'',''editor''))', t);
  end loop;

  -- admin-only areas
  foreach t in array array['profiles','site_settings','marketing_pixels']
  loop
    execute format('drop policy if exists admin_write on public.%I', t);
    execute format('create policy admin_write on public.%I for all to authenticated using (public.app_role() = ''admin'') with check (public.app_role() = ''admin'')', t);
  end loop;

  -- public site: published, visible content only
  foreach t in array array['page_sections','brands','products']
  loop
    execute format('drop policy if exists public_read on public.%I', t);
    execute format('create policy public_read on public.%I for select to anon using (visible and published_snapshot is not null)', t);
  end loop;
  foreach t in array array['locations','social_links']
  loop
    execute format('drop policy if exists public_read on public.%I', t);
    execute format('create policy public_read on public.%I for select to anon using (visible)', t);
  end loop;
  foreach t in array array['pages','wilayas','seo_entries','site_settings']
  loop
    execute format('drop policy if exists public_read on public.%I', t);
    execute format('create policy public_read on public.%I for select to anon using (true)', t);
  end loop;
end $$;

-- visitors may submit forms (insert only, always as "new")
drop policy if exists public_submit on public.distributor_requests;
create policy public_submit on public.distributor_requests for insert to anon with check (status = 'new' and internal_notes = '');
drop policy if exists public_submit on public.contact_messages;
create policy public_submit on public.contact_messages for insert to anon with check (status = 'new' and internal_notes = '');

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects for select using (bucket_id = 'media');
drop policy if exists media_editor_write on storage.objects;
create policy media_editor_write on storage.objects for all to authenticated
  using (bucket_id = 'media' and public.app_role() in ('admin','editor'))
  with check (bucket_id = 'media' and public.app_role() in ('admin','editor'));
