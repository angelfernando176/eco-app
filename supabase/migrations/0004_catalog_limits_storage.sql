-- 0004_catalog_limits_storage.sql
-- Límites por plan y Storage del catálogo (logo, imágenes de producto, videos).
-- Administrador: sin restricciones (is_admin() exime todos los límites).
-- Sin suscripción: 1 negocio, 1 producto, sin videos, 1 skill.
-- Con suscripción activa: 7 negocios, 7 productos, 7 imágenes/producto, 2 videos/negocio, 10 skills.
-- Idempotente. Solo toca el esquema `eco` y los objetos de Storage de ECO (bucket `eco-media`).

-- ---------------------------------------------------------------------------
-- 1. Límites (triggers)
-- ---------------------------------------------------------------------------

-- Negocios: 1 sin suscripción, 7 con suscripción activa (según el dueño).
create or replace function ECO.enforce_businesses_limit() returns trigger as $$
declare active_sub boolean; owned integer; max_businesses integer;
begin
  if ECO.is_admin() then return new; end if;

  -- Serializa inserts concurrentes del mismo dueño (evita la carrera de conteo).
  perform 1 from ECO.users where id = new.owner_id for update;
  select exists (select 1 from ECO.subscriptions where user_id = new.owner_id and status = 'active') into active_sub;
  max_businesses := case when active_sub then 7 else 1 end;
  select count(*) into owned from ECO.businesses where owner_id = new.owner_id;
  if owned >= max_businesses then
    raise exception 'business limit exceeded (max %)', max_businesses;
  end if;
  return new;
end; $$ language plpgsql;

-- Productos: 1 sin suscripción, 7 con suscripción activa (por negocio).
create or replace function ECO.enforce_products_limit() returns trigger as $$
declare subscribed boolean; max_products integer; current_products integer;
begin
  if ECO.is_admin() then return new; end if;

  perform 1 from ECO.businesses where id = new.business_id for update;
  select exists (
    select 1 from ECO.subscriptions s
    join ECO.businesses b on b.id = new.business_id and s.user_id = b.owner_id and s.status = 'active'
  ) into subscribed;
  max_products := case when subscribed then 7 else 1 end;
  select count(*) into current_products from ECO.products where business_id = new.business_id;
  if current_products >= max_products then
    raise exception 'product limit exceeded (max %)', max_products;
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists products_enforce_limit on ECO.products;
create trigger products_enforce_limit before insert on ECO.products
  for each row execute function ECO.enforce_products_limit();

-- Producto principal/secundario: solo el Administrador.
create or replace function ECO.guard_product_flags() returns trigger as $$
begin
  if ECO.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if new.is_primary or new.is_secondary then
      raise exception 'only an administrator can mark primary/secondary products';
    end if;
  elsif new.is_primary is distinct from old.is_primary
     or new.is_secondary is distinct from old.is_secondary then
    raise exception 'only an administrator can mark primary/secondary products';
  end if;
  return new;
end; $$ language plpgsql;
drop trigger if exists products_guard_flags on ECO.products;
create trigger products_guard_flags before insert or update on ECO.products
  for each row execute function ECO.guard_product_flags();

-- Skills: 1 sin suscripción, 10 con suscripción activa.
create or replace function ECO.enforce_skills_limit() returns trigger as $$
declare subscribed boolean; max_skills integer; current_skills integer;
begin
  if ECO.is_admin() then return new; end if;
  select exists (
    select 1 from ECO.subscriptions s join ECO.businesses b on b.id = new.business_id and s.user_id = b.owner_id and s.status = 'active'
  ) into subscribed;
  max_skills := case when subscribed then 10 else 1 end;
  select count(*) into current_skills from ECO.skills where business_id = new.business_id;
  if current_skills >= max_skills then raise exception 'skill limit exceeded (max %)', max_skills; end if;
  return new;
end; $$ language plpgsql;

-- Imágenes de producto: máx. 7 por producto (el Administrador queda exento).
create or replace function ECO.enforce_product_images_limit() returns trigger as $$
declare current_images integer;
begin
  if ECO.is_admin() then return new; end if;
  select count(*) into current_images from ECO.product_images where product_id = new.product_id;
  if current_images >= 7 then raise exception 'product image limit exceeded (max 7)'; end if;
  return new;
end; $$ language plpgsql;

-- Videos: máx. 2 por negocio (ya no hay tope por producto). Sin suscripción no hay
-- permiso de escritura (can_manage_catalog); el Administrador queda exento.
create or replace function ECO.enforce_videos_limit() returns trigger as $$
declare business_videos integer;
begin
  if ECO.is_admin() then return new; end if;
  select count(*) into business_videos from ECO.videos where business_id = new.business_id;
  if business_videos >= 2 then raise exception 'video limit exceeded per business (max 2)'; end if;
  return new;
end; $$ language plpgsql;

-- ---------------------------------------------------------------------------
-- 2. RLS de productos: el dueño (aun sin suscripción) gestiona sus productos;
--    el tope (1/7) lo aplica el trigger. Imágenes y videos siguen requiriendo
--    suscripción activa (can_manage_catalog).
-- ---------------------------------------------------------------------------
drop policy if exists products_insert_catalog on ECO.products;
drop policy if exists products_update_catalog on ECO.products;
drop policy if exists products_delete_catalog on ECO.products;
drop policy if exists products_insert_owner_or_admin on ECO.products;
drop policy if exists products_update_owner_or_admin on ECO.products;
drop policy if exists products_delete_owner_or_admin on ECO.products;

create policy products_insert_owner_or_admin on ECO.products
  for insert with check (ECO.is_admin() or ECO.owns_business(business_id));
create policy products_update_owner_or_admin on ECO.products
  for update using (ECO.is_admin() or ECO.owns_business(business_id))
  with check (ECO.is_admin() or ECO.owns_business(business_id));
create policy products_delete_owner_or_admin on ECO.products
  for delete using (ECO.is_admin() or ECO.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- 3. Storage: bucket `eco-media` (lectura pública; escritura por negocio)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eco-media', 'eco-media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Id del negocio embebido en la ruta `<tipo>/<business_id>/<archivo>` (o null).
create or replace function ECO.storage_business_id(object_name text) returns uuid
language sql stable as $$
  select case
    when (storage.foldername(object_name))[2]
         ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (storage.foldername(object_name))[2]::uuid
  end
$$;

-- ¿Puede el usuario escribir este objeto? Carpetas válidas: logos | products | videos,
-- y solo si gestiona el catálogo del negocio (admin o dueño con suscripción activa).
create or replace function ECO.can_write_media(object_name text) returns boolean
language sql stable as $$
  select (storage.foldername(object_name))[1] in ('logos', 'products', 'videos')
     and ECO.storage_business_id(object_name) is not null
     and ECO.can_manage_catalog(ECO.storage_business_id(object_name))
$$;

drop policy if exists eco_media_select on storage.objects;
drop policy if exists eco_media_insert on storage.objects;
drop policy if exists eco_media_update on storage.objects;
drop policy if exists eco_media_delete on storage.objects;

create policy eco_media_select on storage.objects
  for select using (bucket_id = 'eco-media');
create policy eco_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'eco-media' and ECO.can_write_media(name));
create policy eco_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'eco-media' and ECO.can_write_media(name))
  with check (bucket_id = 'eco-media' and ECO.can_write_media(name));
create policy eco_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'eco-media' and ECO.can_write_media(name));
