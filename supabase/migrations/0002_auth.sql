-- 0002_auth.sql — Autenticación (Supabase Auth) y Row Level Security por rol.
--
-- IMPORTANTE: igual que en 0001, todo vive en el esquema "ECO". El esquema
-- "public" pertenece a OTRO proyecto y no se lee ni se modifica.
--
-- La autenticación (registro con confirmación por correo, inicio de sesión y
-- recuperación de credenciales) la resuelve Supabase Auth. Esta migración:
--   1. crea el perfil en `ECO.users` al registrarse (trigger on auth.users);
--   2. expone helpers de autorización (rol admin vía JWT, usuario actual, dueño,
--      suscripción activa);
--   3. habilita RLS y políticas por rol (administrador / web/escritorio / móvil).
--
-- Rol "admin": se expresa como auth.users.raw_app_meta_data.role = 'admin'
-- (claim JWT), no como columna de `ECO.users`. `web_user` = autenticado sin ese
-- claim; `mobile_user` = ECO.users.type = 2 (sin cuenta Auth, por ahora solo
-- lectura).

-- ---------------------------------------------------------------------------
-- 1. Perfil automático al registrarse (Supabase Auth)
-- ---------------------------------------------------------------------------
create or replace function ECO.handle_new_user() returns trigger
language plpgsql security definer set search_path = ECO, extensions as $$
begin
  insert into ECO.users (auth_user_id, first_name, last_name, age_range, email, type, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'age_range', ''),
    new.email,
    1,      -- 1 = usuario web/escritorio
    'active'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function ECO.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Helpers de autorización (leídos por las políticas RLS)
-- ---------------------------------------------------------------------------

-- Administrador: claim "role=admin" en app_metadata del JWT de Auth.
create or replace function ECO.is_admin() returns boolean
language sql stable security definer set search_path = ECO, extensions as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- Id de la fila en ECO.users del usuario autenticado (o null).
create or replace function ECO.current_user_id() returns uuid
language sql stable security definer set search_path = ECO, extensions as $$
  select id from ECO.users where auth_user_id = auth.uid()
$$;

-- ¿El usuario autenticado es dueño del negocio dado?
create or replace function ECO.owns_business(business_id uuid) returns boolean
language sql stable security definer set search_path = ECO, extensions as $$
  select exists (
    select 1
    from ECO.businesses b
    where b.id = business_id and b.owner_id = ECO.current_user_id()
  )
$$;

-- ¿El usuario autenticado tiene una suscripción activa?
create or replace function ECO.has_active_subscription() returns boolean
language sql stable security definer set search_path = ECO, extensions as $$
  select exists (
    select 1
    from ECO.subscriptions s
    where s.user_id = ECO.current_user_id() and s.status = 'active'
  )
$$;

-- Gestión de menú/videos (productos, imágenes, videos): admin, o dueño con suscripción activa.
create or replace function ECO.can_manage_catalog(business_id uuid) returns boolean
language sql stable security definer set search_path = ECO, extensions as $$
  select ECO.is_admin() or (
    ECO.owns_business(business_id) and ECO.has_active_subscription()
  )
$$;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security por rol
-- ---------------------------------------------------------------------------

-- ---------- users ----------
alter table ECO.users enable row level security;

-- Lectura y edición: administrador (global) o el propio usuario.
create policy users_select_own_or_admin on ECO.users
  for select using (ECO.is_admin() or auth_user_id = auth.uid());

create policy users_update_own_or_admin on ECO.users
  for update using (ECO.is_admin() or auth_user_id = auth.uid())
  with check (ECO.is_admin() or auth_user_id = auth.uid());

-- Sin política DELETE: fuerza el borrado lógico (status -> 'inactive') del spec.

-- ---------- businesses ----------
alter table ECO.businesses enable row level security;

-- Lectura pública: la app móvil busca y consulta negocios.
create policy businesses_select_public on ECO.businesses
  for select using (true);

create policy businesses_insert_own_or_admin on ECO.businesses
  for insert with check (ECO.is_admin() or owner_id = ECO.current_user_id());

create policy businesses_update_own_or_admin on ECO.businesses
  for update using (ECO.is_admin() or owner_id = ECO.current_user_id())
  with check (ECO.is_admin() or owner_id = ECO.current_user_id());

-- Borrado solo del administrador (el usuario web/escritorio crea y edita, no borra).
create policy businesses_delete_admin on ECO.businesses
  for delete using (ECO.is_admin());

-- ---------- products ----------
alter table ECO.products enable row level security;

create policy products_select_public on ECO.products
  for select using (true);

create policy products_insert_catalog on ECO.products
  for insert with check (ECO.can_manage_catalog(business_id));

create policy products_update_catalog on ECO.products
  for update using (ECO.can_manage_catalog(business_id))
  with check (ECO.can_manage_catalog(business_id));

create policy products_delete_catalog on ECO.products
  for delete using (ECO.can_manage_catalog(business_id));

-- ---------- product_images ----------
alter table ECO.product_images enable row level security;

create policy product_images_select_public on ECO.product_images
  for select using (true);

create policy product_images_insert_catalog on ECO.product_images
  for insert with check (
    ECO.can_manage_catalog((select p.business_id from ECO.products p where p.id = product_id))
  );

create policy product_images_update_catalog on ECO.product_images
  for update using (
    ECO.can_manage_catalog((select p.business_id from ECO.products p where p.id = product_id))
  )
  with check (
    ECO.can_manage_catalog((select p.business_id from ECO.products p where p.id = product_id))
  );

create policy product_images_delete_catalog on ECO.product_images
  for delete using (
    ECO.can_manage_catalog((select p.business_id from ECO.products p where p.id = product_id))
  );

-- ---------- videos ----------
alter table ECO.videos enable row level security;

create policy videos_select_public on ECO.videos
  for select using (true);

create policy videos_insert_catalog on ECO.videos
  for insert with check (ECO.can_manage_catalog(business_id));

create policy videos_update_catalog on ECO.videos
  for update using (ECO.can_manage_catalog(business_id))
  with check (ECO.can_manage_catalog(business_id));

create policy videos_delete_catalog on ECO.videos
  for delete using (ECO.can_manage_catalog(business_id));

-- ---------- skills ----------
alter table ECO.skills enable row level security;

create policy skills_select_public on ECO.skills
  for select using (true);

-- Skills: administrador o dueño (los límites 1/10 ya los aplican los triggers de 0001).
create policy skills_insert_owner_or_admin on ECO.skills
  for insert with check (ECO.is_admin() or ECO.owns_business(business_id));

create policy skills_update_owner_or_admin on ECO.skills
  for update using (ECO.is_admin() or ECO.owns_business(business_id))
  with check (ECO.is_admin() or ECO.owns_business(business_id));

create policy skills_delete_owner_or_admin on ECO.skills
  for delete using (ECO.is_admin() or ECO.owns_business(business_id));

-- ---------- ratings ----------
alter table ECO.ratings enable row level security;

-- Lectura pública: ranking y comentarios visibles en la app móvil.
create policy ratings_select_public on ECO.ratings
  for select using (true);

-- INSERT (calificar) desde la app móvil: pendiente de la feature de sincronización
-- móvil → Supabase. Sin política de INSERT por ahora (denegado por defecto).

-- ---------- subscriptions ----------
alter table ECO.subscriptions enable row level security;

create policy subscriptions_select_own_or_admin on ECO.subscriptions
  for select using (ECO.is_admin() or user_id = ECO.current_user_id());

-- La activación de suscripción la hace el administrador desde gestión de usuarios.
create policy subscriptions_insert_admin on ECO.subscriptions
  for insert with check (ECO.is_admin());

create policy subscriptions_update_admin on ECO.subscriptions
  for update using (ECO.is_admin())
  with check (ECO.is_admin());

-- Sin política DELETE.

-- ---------- permisos sobre las funciones nuevas ----------
grant all on all routines in schema ECO to anon, authenticated, service_role;
