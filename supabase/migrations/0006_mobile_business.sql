-- 0006_mobile_business.sql — Registro, edición y baja de negocio desde la app móvil.
--
-- IMPORTANTE: igual que en las migraciones previas, todo vive en el esquema "ECO".
-- El esquema "public" pertenece a OTRO proyecto y no se lee ni se modifica.
--
-- El dueño del negocio móvil es el mismo perfil de `register_mobile_user`
-- (ECO.users.type = 2, sin cuenta de Auth: opera como `anon`). El negocio se
-- crea/edita/da de baja vía RPC SECURITY DEFINER (mismo patrón que
-- register_mobile_user/submit_rating de 0005), nunca por INSERT/UPDATE directo
-- (RLS de businesses exige auth.uid(), que no existe para `anon`). Idempotente.

-- ---------------------------------------------------------------------------
-- 1. Columnas nuevas en businesses: status, password_hash, y columnas que el
--    móvil no recolecta pasan a ser nullable (la UI web sigue exigiéndolas por
--    validación de formulario, no por constraint de BD).
-- ---------------------------------------------------------------------------
alter table ECO.businesses
  add column if not exists status text not null default 'active' check (status in ('active', 'inactive'));

alter table ECO.businesses
  add column if not exists password_hash text;

alter table ECO.businesses alter column representative_email drop not null;
alter table ECO.businesses alter column main_street drop not null;
alter table ECO.businesses alter column secondary_street drop not null;
alter table ECO.businesses alter column number drop not null;
alter table ECO.businesses alter column reference drop not null;

-- ---------------------------------------------------------------------------
-- 2. Encuesta de baja (motivos fijos + comentario opcional). Solo se inserta
--    a través de la RPC deactivate_mobile_business (sin política de INSERT).
-- ---------------------------------------------------------------------------
create table if not exists ECO.business_deactivation_feedback (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references ECO.businesses (id) on delete cascade,
  reason text not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);

alter table ECO.business_deactivation_feedback enable row level security;

drop policy if exists business_deactivation_feedback_select_admin_or_owner on ECO.business_deactivation_feedback;
create policy business_deactivation_feedback_select_admin_or_owner on ECO.business_deactivation_feedback
  for select using (ECO.is_admin() or ECO.owns_business(business_id));

-- ---------------------------------------------------------------------------
-- 3. Lectura pública de negocios: deja de mostrar negocios dados de baja al
--    público/móvil (status='inactive'), pero admin y dueño (web o, vía RPC
--    security definer, móvil) siguen viendo sus propios negocios inactivos.
-- ---------------------------------------------------------------------------
drop policy if exists businesses_select_public on ECO.businesses;
create policy businesses_select_public on ECO.businesses
  for select using (status = 'active' or ECO.is_admin() or owner_id = ECO.current_user_id());

-- ---------------------------------------------------------------------------
-- 4. Alta de negocio desde el móvil (usuario móvil ya registrado, sin cuenta
--    de Auth). Valida dueño, campos y password server-side (no confiar en el
--    cliente), hashea la password y crea el negocio + su producto principal.
--    El trigger businesses_enforce_limit (0004) aplica sin cambios.
-- ---------------------------------------------------------------------------
create or replace function ECO.register_mobile_business(
  p_owner_id uuid,
  p_trade_name text,
  p_ruc text,
  p_phone text,
  p_latitude double precision,
  p_longitude double precision,
  p_password text,
  p_product_name text,
  p_product_price numeric
)
returns uuid
language plpgsql security definer set search_path = ECO, extensions as $$
declare
  v_trade_name text;
  v_ruc text;
  v_phone text;
  v_product_name text;
  v_business_id uuid;
begin
  if not exists (
    select 1 from ECO.users
    where id = p_owner_id and type = 2 and status = 'active'
  ) then
    raise exception 'unknown or inactive mobile owner';
  end if;

  v_trade_name := trim(coalesce(p_trade_name, ''));
  if length(v_trade_name) < 2 or length(v_trade_name) > 100 then
    raise exception 'trade name must be between 2 and 100 characters';
  end if;

  v_ruc := trim(coalesce(p_ruc, ''));
  if length(v_ruc) < 1 or length(v_ruc) > 20 then
    raise exception 'ruc must be between 1 and 20 characters';
  end if;

  v_phone := trim(coalesce(p_phone, ''));
  if length(v_phone) < 1 or length(v_phone) > 20 then
    raise exception 'phone must be between 1 and 20 characters';
  end if;

  v_product_name := trim(coalesce(p_product_name, ''));
  if length(v_product_name) < 1 or length(v_product_name) > 100 then
    raise exception 'product name must be between 1 and 100 characters';
  end if;

  if p_password is null
     or length(p_password) < 6
     or p_password !~ '[A-Za-z]'
     or p_password !~ '[0-9]'
  then
    raise exception 'password must be at least 6 characters and contain letters and numbers';
  end if;

  insert into ECO.businesses (
    owner_id, trade_name, ruc, phone, latitude, longitude, password_hash, status
  )
  values (
    p_owner_id, v_trade_name, v_ruc, v_phone, p_latitude, p_longitude,
    extensions.crypt(p_password, extensions.gen_salt('bf')), 'active'
  )
  returning id into v_business_id;

  insert into ECO.products (business_id, name, price, is_primary, is_secondary)
  values (v_business_id, v_product_name, coalesce(p_product_price, 0), false, false);

  return v_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Edición de negocio desde el móvil (datos del negocio + producto
--    principal, password opcional).
-- ---------------------------------------------------------------------------
create or replace function ECO.update_mobile_business(
  p_business_id uuid,
  p_owner_id uuid,
  p_trade_name text,
  p_ruc text,
  p_phone text,
  p_latitude double precision,
  p_longitude double precision,
  p_product_name text,
  p_product_price numeric,
  p_password text default null
)
returns void
language plpgsql security definer set search_path = ECO, extensions as $$
declare
  v_trade_name text;
  v_ruc text;
  v_phone text;
  v_product_name text;
  v_product_id uuid;
begin
  if not exists (
    select 1 from ECO.businesses where id = p_business_id and owner_id = p_owner_id
  ) then
    raise exception 'unknown or not owned business';
  end if;

  v_trade_name := trim(coalesce(p_trade_name, ''));
  if length(v_trade_name) < 2 or length(v_trade_name) > 100 then
    raise exception 'trade name must be between 2 and 100 characters';
  end if;

  v_ruc := trim(coalesce(p_ruc, ''));
  if length(v_ruc) < 1 or length(v_ruc) > 20 then
    raise exception 'ruc must be between 1 and 20 characters';
  end if;

  v_phone := trim(coalesce(p_phone, ''));
  if length(v_phone) < 1 or length(v_phone) > 20 then
    raise exception 'phone must be between 1 and 20 characters';
  end if;

  v_product_name := trim(coalesce(p_product_name, ''));
  if length(v_product_name) < 1 or length(v_product_name) > 100 then
    raise exception 'product name must be between 1 and 100 characters';
  end if;

  update ECO.businesses
  set trade_name = v_trade_name,
      ruc = v_ruc,
      phone = v_phone,
      latitude = p_latitude,
      longitude = p_longitude
  where id = p_business_id;

  select id into v_product_id
  from ECO.products
  where business_id = p_business_id
  order by created_at asc
  limit 1;

  if v_product_id is null then
    insert into ECO.products (business_id, name, price, is_primary, is_secondary)
    values (p_business_id, v_product_name, coalesce(p_product_price, 0), false, false);
  else
    update ECO.products
    set name = v_product_name, price = coalesce(p_product_price, 0)
    where id = v_product_id;
  end if;

  if p_password is not null then
    if length(p_password) < 6
       or p_password !~ '[A-Za-z]'
       or p_password !~ '[0-9]'
    then
      raise exception 'password must be at least 6 characters and contain letters and numbers';
    end if;

    update ECO.businesses
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
    where id = p_business_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Baja de negocio (encuesta + status -> inactive; no borra nada).
-- ---------------------------------------------------------------------------
create or replace function ECO.deactivate_mobile_business(
  p_business_id uuid,
  p_owner_id uuid,
  p_reason text,
  p_comment text default ''
)
returns void
language plpgsql security definer set search_path = ECO, extensions as $$
declare
  v_comment text;
begin
  if not exists (
    select 1 from ECO.businesses where id = p_business_id and owner_id = p_owner_id
  ) then
    raise exception 'unknown or not owned business';
  end if;

  if p_reason is null or p_reason not in ('closed', 'no_time', 'app_issues', 'other') then
    raise exception 'invalid deactivation reason: %', p_reason;
  end if;

  v_comment := trim(coalesce(p_comment, ''));
  if length(v_comment) > 500 then
    raise exception 'comment must be at most 500 characters';
  end if;

  insert into ECO.business_deactivation_feedback (business_id, reason, comment)
  values (p_business_id, p_reason, v_comment);

  update ECO.businesses set status = 'inactive' where id = p_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Estado del negocio + suscripción del dueño (para habilitar fotos/videos/
--    skills en "Ver negocio" solo con suscripción activa).
-- ---------------------------------------------------------------------------
create or replace function ECO.get_mobile_business_status(p_business_id uuid, p_owner_id uuid)
returns table(status text, has_active_subscription boolean)
language plpgsql stable security definer set search_path = ECO, extensions as $$
begin
  if not exists (
    select 1 from ECO.businesses where id = p_business_id and owner_id = p_owner_id
  ) then
    raise exception 'unknown or not owned business';
  end if;

  return query
  select b.status, exists (
    select 1 from ECO.subscriptions s where s.user_id = p_owner_id and s.status = 'active'
  )
  from ECO.businesses b
  where b.id = p_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Skills desde el móvil (sin cuenta de Auth). El trigger skills_enforce_limit
--    (0001/0004) aplica sin cambios (1 sin suscripción, 10 con suscripción).
-- ---------------------------------------------------------------------------
create or replace function ECO.add_mobile_skill(p_business_id uuid, p_owner_id uuid, p_name text)
returns uuid
language plpgsql security definer set search_path = ECO, extensions as $$
declare
  v_name text;
  v_id uuid;
begin
  if not exists (
    select 1 from ECO.businesses where id = p_business_id and owner_id = p_owner_id
  ) then
    raise exception 'unknown or not owned business';
  end if;

  v_name := trim(coalesce(p_name, ''));
  if length(v_name) < 1 or length(v_name) > 50 then
    raise exception 'skill name must be between 1 and 50 characters';
  end if;

  insert into ECO.skills (business_id, name)
  values (p_business_id, v_name)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function ECO.delete_mobile_skill(p_skill_id uuid, p_owner_id uuid)
returns void
language plpgsql security definer set search_path = ECO, extensions as $$
begin
  if not exists (
    select 1 from ECO.skills s
    join ECO.businesses b on b.id = s.business_id
    where s.id = p_skill_id and b.owner_id = p_owner_id
  ) then
    raise exception 'unknown or not owned skill';
  end if;

  delete from ECO.skills where id = p_skill_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Permisos: solo ejecución explícita de las RPC (sin escritura directa para anon).
-- ---------------------------------------------------------------------------
revoke execute on function ECO.register_mobile_business(uuid, text, text, text, double precision, double precision, text, text, numeric) from public;
revoke execute on function ECO.update_mobile_business(uuid, uuid, text, text, text, double precision, double precision, text, numeric, text) from public;
revoke execute on function ECO.deactivate_mobile_business(uuid, uuid, text, text) from public;
revoke execute on function ECO.get_mobile_business_status(uuid, uuid) from public;
revoke execute on function ECO.add_mobile_skill(uuid, uuid, text) from public;
revoke execute on function ECO.delete_mobile_skill(uuid, uuid) from public;

grant execute on function ECO.register_mobile_business(uuid, text, text, text, double precision, double precision, text, text, numeric) to anon, authenticated, service_role;
grant execute on function ECO.update_mobile_business(uuid, uuid, text, text, text, double precision, double precision, text, numeric, text) to anon, authenticated, service_role;
grant execute on function ECO.deactivate_mobile_business(uuid, uuid, text, text) to anon, authenticated, service_role;
grant execute on function ECO.get_mobile_business_status(uuid, uuid) to anon, authenticated, service_role;
grant execute on function ECO.add_mobile_skill(uuid, uuid, text) to anon, authenticated, service_role;
grant execute on function ECO.delete_mobile_skill(uuid, uuid) to anon, authenticated, service_role;
