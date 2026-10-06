-- stubs.sql — minimal Supabase platform stubs for a plain postgres:16 container.
-- No secrets. Only recreates the pieces ECO's migrations/tests rely on:
-- roles (anon/authenticated/service_role), schema `auth` (table + auth.uid()/auth.jwt()
-- reading the same "request.jwt.claims" GUC Supabase uses), schema `extensions`
-- (pgcrypto + pgtap), and schema `storage` (buckets/objects + storage.foldername()).
-- Idempotent.

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgtap with schema extensions;

-- Supabase's actual default search_path includes `extensions`, which is how
-- unqualified calls like gen_random_uuid() resolve in the ECO migrations.
alter database postgres set search_path to "$user", public, extensions;

-- ---------- auth ----------
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default extensions.gen_random_uuid(),
  email text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

-- ---------- storage ----------
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default extensions.gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select case
    when name is null or position('/' in name) = 0 then '{}'::text[]
    else (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1]
  end
$$;

-- ---------- grants mirroring Supabase's platform roles ----------
grant usage on schema auth, storage, extensions to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;

-- The container's superuser (postgres) runs the migrations and switches role
-- in tests via SET ROLE; Postgres superusers may SET ROLE to any role, so no
-- explicit membership grant is required here.
