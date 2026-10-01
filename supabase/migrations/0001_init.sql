-- 0001_init.sql — Esquema base de ECO (almacenamiento central en Supabase/PostgreSQL).
--
-- Solo incluye entidades y campos definidos en el prompt del proyecto.
-- Autenticación (confirmación por correo, recuperación de credenciales) se
-- resuelve con Supabase Auth; `users.auth_user_id` enlaza el perfil de la app
-- con la cuenta de Auth cuando existe (usuarios web/escritorio).
--
-- Pendiente antes de producción: habilitar Row Level Security por rol
-- (administrador global, usuario web/escritorio sobre sus negocios, usuario
-- móvil de solo lectura) y políticas acordes.

-- ---------- usuarios (web/escritorio y móvil) ----------
create table users (
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
create table businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
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
create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(10, 2) not null default 0,
  is_primary boolean not null default false,
  is_secondary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  description text not null default '',
  position integer not null default 0
);

-- ---------- videos ----------
create table videos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

-- ---------- skills (palabras clave) ----------
create table skills (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

-- ---------- calificaciones y comentarios ----------
create table ratings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  mobile_user_id uuid not null references users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- suscripciones ----------
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- índices ----------
create index businesses_owner_id_idx on businesses (owner_id);
create index products_business_id_idx on products (business_id);
create index product_images_product_id_idx on product_images (product_id);
create index videos_business_id_idx on videos (business_id);
create index videos_product_id_idx on videos (product_id);
create index skills_business_id_idx on skills (business_id);
create index ratings_business_id_idx on ratings (business_id);
create index ratings_mobile_user_id_idx on ratings (mobile_user_id);
create index subscriptions_user_id_idx on subscriptions (user_id);

-- ---------- updated_at automático ----------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_set_updated_at before update on users for each row execute function set_updated_at();
create trigger businesses_set_updated_at before update on businesses for each row execute function set_updated_at();
create trigger products_set_updated_at before update on products for each row execute function set_updated_at();
create trigger subscriptions_set_updated_at before update on subscriptions for each row execute function set_updated_at();

-- ---------- límites de negocio (packages/shared/src/domain/limits.ts) ----------
create or replace function enforce_businesses_limit() returns trigger as $$
declare active_sub boolean; owned integer;
begin
  -- Serializa inserts concurrentes del mismo dueño para evitar la carrera
  -- en la que dos inserts ven ambos cero negocios existentes.
  perform 1 from users where id = new.owner_id for update;
  select exists (select 1 from subscriptions where user_id = new.owner_id and status = 'active') into active_sub;
  if not active_sub then
    select count(*) into owned from businesses where owner_id = new.owner_id;
    if owned >= 1 then raise exception 'business limit exceeded without active subscription (max 1)'; end if;
  end if;
  return new;
end; $$ language plpgsql;
create trigger businesses_enforce_limit before insert on businesses for each row execute function enforce_businesses_limit();

create or replace function enforce_skills_limit() returns trigger as $$
declare subscribed boolean; max_skills integer; current_skills integer;
begin
  select exists (
    select 1 from subscriptions s join businesses b on b.id = new.business_id and s.user_id = b.owner_id and s.status = 'active'
  ) into subscribed;
  max_skills := case when subscribed then 10 else 1 end;
  select count(*) into current_skills from skills where business_id = new.business_id;
  if current_skills >= max_skills then raise exception 'skill limit exceeded (max %)', max_skills; end if;
  return new;
end; $$ language plpgsql;
create trigger skills_enforce_limit before insert on skills for each row execute function enforce_skills_limit();

create or replace function enforce_product_images_limit() returns trigger as $$
declare current_images integer;
begin
  select count(*) into current_images from product_images where product_id = new.product_id;
  if current_images >= 7 then raise exception 'product image limit exceeded (max 7)'; end if;
  return new;
end; $$ language plpgsql;
create trigger product_images_enforce_limit before insert on product_images for each row execute function enforce_product_images_limit();

create or replace function enforce_videos_limit() returns trigger as $$
declare product_videos integer; business_videos integer;
begin
  select count(*) into product_videos from videos where product_id = new.product_id;
  if product_videos >= 1 then raise exception 'video limit exceeded per product (max 1)'; end if;
  select count(*) into business_videos from videos where business_id = new.business_id;
  if business_videos >= 7 then raise exception 'video limit exceeded per business (max 7)'; end if;
  return new;
end; $$ language plpgsql;
create trigger videos_enforce_limit before insert on videos for each row execute function enforce_videos_limit();
