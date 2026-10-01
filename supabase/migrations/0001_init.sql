-- 0001_init.sql — Esquema base de ECO (almacenamiento central en Supabase/PostgreSQL).
--
-- IMPORTANTE: todo el modelo de datos de ECO vive en el esquema "ECO".
-- El esquema "public" pertenece a OTRO proyecto y no debe leerse ni modificarse.
--
-- Solo incluye entidades y campos definidos en el prompt del proyecto.
-- Autenticación (confirmación por correo, recuperación de credenciales) se
-- resuelve con Supabase Auth; `users.auth_user_id` enlaza el perfil de la app
-- con la cuenta de Auth cuando existe (usuarios web/escritorio).
--
-- Pendiente antes de producción: habilitar Row Level Security por rol
-- (administrador global, usuario web/escritorio sobre sus negocios, usuario
-- móvil de solo lectura) y políticas acordes. Se habilita en 0002_auth.sql.

create schema if not exists ECO;

-- ---------- usuarios (web/escritorio y móvil) ----------
create table ECO.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  first_name text not null,
  last_name text not null,
  age_range text not null,
  email text unique,
  type smallint not null check (type in (1, 2)), -- 1 = web/escritorio, 2 = móvil
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- negocios ----------
create table ECO.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references ECO.users (id) on delete cascade,
  trade_name text not null,
  ruc text not null,
  phone text not null,
  representative_email text not null,
  logo_url text,
  latitude double precision not null,
  longitude double precision not null,
  main_street text not null,
  secondary_street text not null,
  number text not null,
  reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- menú: productos ----------
create table ECO.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references ECO.businesses (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null default 0,
  is_primary boolean not null default false,
  is_secondary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table ECO.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references ECO.products (id) on delete cascade,
  url text not null,
  description text not null default '',
  position integer not null default 0
);

-- ---------- videos ----------
create table ECO.videos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references ECO.businesses (id) on delete cascade,
  product_id uuid not null references ECO.products (id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

-- ---------- skills (palabras clave) ----------
create table ECO.skills (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references ECO.businesses (id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

-- ---------- calificaciones y comentarios ----------
create table ECO.ratings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references ECO.businesses (id) on delete cascade,
  mobile_user_id uuid not null references ECO.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- suscripciones ----------
create table ECO.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references ECO.users (id) on delete cascade,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- índices ----------
create index businesses_owner_id_idx on ECO.businesses (owner_id);
create index products_business_id_idx on ECO.products (business_id);
create index product_images_product_id_idx on ECO.product_images (product_id);
create index videos_business_id_idx on ECO.videos (business_id);
create index videos_product_id_idx on ECO.videos (product_id);
create index skills_business_id_idx on ECO.skills (business_id);
create index ratings_business_id_idx on ECO.ratings (business_id);
create index ratings_mobile_user_id_idx on ECO.ratings (mobile_user_id);
create index subscriptions_user_id_idx on ECO.subscriptions (user_id);

-- ---------- updated_at automático ----------
create or replace function ECO.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_set_updated_at before update on ECO.users for each row execute function ECO.set_updated_at();
create trigger businesses_set_updated_at before update on ECO.businesses for each row execute function ECO.set_updated_at();
create trigger products_set_updated_at before update on ECO.products for each row execute function ECO.set_updated_at();
create trigger subscriptions_set_updated_at before update on ECO.subscriptions for each row execute function ECO.set_updated_at();

-- ---------- límites de negocio (packages/shared/src/domain/limits.ts) ----------
create or replace function ECO.enforce_businesses_limit() returns trigger as $$
declare active_sub boolean; owned integer;
begin
  -- Serializa inserts concurrentes del mismo dueño para evitar la carrera
  -- en la que dos inserts ven ambos cero negocios existentes.
  perform 1 from ECO.users where id = new.owner_id for update;
  select exists (select 1 from ECO.subscriptions where user_id = new.owner_id and status = 'active') into active_sub;
  if not active_sub then
    select count(*) into owned from ECO.businesses where owner_id = new.owner_id;
    if owned >= 1 then raise exception 'business limit exceeded without active subscription (max 1)'; end if;
  end if;
  return new;
end; $$ language plpgsql;
create trigger businesses_enforce_limit before insert on ECO.businesses for each row execute function ECO.enforce_businesses_limit();

create or replace function ECO.enforce_skills_limit() returns trigger as $$
declare subscribed boolean; max_skills integer; current_skills integer;
begin
  select exists (
    select 1 from ECO.subscriptions s join ECO.businesses b on b.id = new.business_id and s.user_id = b.owner_id and s.status = 'active'
  ) into subscribed;
  max_skills := case when subscribed then 10 else 1 end;
  select count(*) into current_skills from ECO.skills where business_id = new.business_id;
  if current_skills >= max_skills then raise exception 'skill limit exceeded (max %)', max_skills; end if;
  return new;
end; $$ language plpgsql;
create trigger skills_enforce_limit before insert on ECO.skills for each row execute function ECO.enforce_skills_limit();

create or replace function ECO.enforce_product_images_limit() returns trigger as $$
declare current_images integer;
begin
  select count(*) into current_images from ECO.product_images where product_id = new.product_id;
  if current_images >= 7 then raise exception 'product image limit exceeded (max 7)'; end if;
  return new;
end; $$ language plpgsql;
create trigger product_images_enforce_limit before insert on ECO.product_images for each row execute function ECO.enforce_product_images_limit();

create or replace function ECO.enforce_videos_limit() returns trigger as $$
declare product_videos integer; business_videos integer;
begin
  select count(*) into product_videos from ECO.videos where product_id = new.product_id;
  if product_videos >= 1 then raise exception 'video limit exceeded per product (max 1)'; end if;
  select count(*) into business_videos from ECO.videos where business_id = new.business_id;
  if business_videos >= 7 then raise exception 'video limit exceeded per business (max 7)'; end if;
  return new;
end; $$ language plpgsql;
create trigger videos_enforce_limit before insert on ECO.videos for each row execute function ECO.enforce_videos_limit();

-- ---------- permisos para la API (PostgREST) y los roles de Supabase ----------
grant usage on schema ECO to anon, authenticated, service_role;
grant all on all tables in schema ECO to anon, authenticated, service_role;
grant all on all sequences in schema ECO to anon, authenticated, service_role;
grant all on all routines in schema ECO to anon, authenticated, service_role;
alter default privileges in schema ECO grant all on tables to anon, authenticated, service_role;
alter default privileges in schema ECO grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema ECO grant all on functions to anon, authenticated, service_role;
