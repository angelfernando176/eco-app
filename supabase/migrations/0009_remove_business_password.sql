-- 0009_remove_business_password.sql — Elimina el concepto de "password de
-- negocio": ECO.businesses.password_hash nunca se usó para autenticar nada
-- (ningún RPC lo compara al hacer login); el acceso real a "Ver negocio" ya
-- pasa por la cuenta única del usuario (ECO.users.password_hash +
-- verify_mobile_password, feature mobile-user-accounts). Debe existir una
-- sola tabla de usuarios/credenciales; businesses no es una.

-- ---------------------------------------------------------------------------
-- 1. admin_set_business_password (0007) solo existía para resetear este
--    campo; sin el campo, no tiene función.
-- ---------------------------------------------------------------------------
drop function if exists ECO.admin_set_business_password(uuid, text);

-- ---------------------------------------------------------------------------
-- 2. register_mobile_business (0006): quitar p_password y el hash en el
--    insert. El tipo de retorno y el resto de validaciones no cambian.
-- ---------------------------------------------------------------------------
drop function if exists ECO.register_mobile_business(uuid, text, text, text, double precision, double precision, text, text, numeric);

create or replace function ECO.register_mobile_business(
  p_owner_id uuid,
  p_trade_name text,
  p_ruc text,
  p_phone text,
  p_latitude double precision,
  p_longitude double precision,
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

  insert into ECO.businesses (
    owner_id, trade_name, ruc, phone, latitude, longitude, status
  )
  values (
    p_owner_id, v_trade_name, v_ruc, v_phone, p_latitude, p_longitude, 'active'
  )
  returning id into v_business_id;

  insert into ECO.products (business_id, name, price, is_primary, is_secondary)
  values (v_business_id, v_product_name, coalesce(p_product_price, 0), false, false);

  return v_business_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. update_mobile_business (0006): quitar p_password y el bloque que
--    actualizaba el hash.
-- ---------------------------------------------------------------------------
drop function if exists ECO.update_mobile_business(uuid, uuid, text, text, text, double precision, double precision, text, numeric, text);

create or replace function ECO.update_mobile_business(
  p_business_id uuid,
  p_owner_id uuid,
  p_trade_name text,
  p_ruc text,
  p_phone text,
  p_latitude double precision,
  p_longitude double precision,
  p_product_name text,
  p_product_price numeric
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
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Columna de businesses: ya no se escribe ni se lee en ningún lado.
-- ---------------------------------------------------------------------------
alter table ECO.businesses drop column if exists password_hash;

-- ---------------------------------------------------------------------------
-- 5. Permisos de las nuevas firmas (las anteriores quedaron eliminadas por
--    los drop function de arriba).
-- ---------------------------------------------------------------------------
revoke execute on function ECO.register_mobile_business(uuid, text, text, text, double precision, double precision, text, numeric) from public;
revoke execute on function ECO.update_mobile_business(uuid, uuid, text, text, text, double precision, double precision, text, numeric) from public;

grant execute on function ECO.register_mobile_business(uuid, text, text, text, double precision, double precision, text, numeric) to anon, authenticated, service_role;
grant execute on function ECO.update_mobile_business(uuid, uuid, text, text, text, double precision, double precision, text, numeric) to anon, authenticated, service_role;
