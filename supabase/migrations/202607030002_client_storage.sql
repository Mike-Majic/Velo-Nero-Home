-- Adds Supabase-backed browser-state storage for deployments that already applied the initial schema.
create table if not exists public.client_storage (
  key text primary key,
  value text not null default '',
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant all privileges on table public.client_storage to service_role;
