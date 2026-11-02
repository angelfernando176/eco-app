-- 0011_mobile_business_admin_owner.sql — Permite que una cuenta admin
-- (ECO.users.type = 1, con claim app_metadata.role = 'admin' en su cuenta
-- de Auth) también pueda registrar negocios desde el móvil, no solo las
-- cuentas móviles (type = 2).
--
-- register_mobile_business se llama como `anon` (sin sesión de Auth activa
-- durante el registro de negocio), así que no se puede usar ECO.is_admin()
-- (lee el JWT del llamante). En su lugar se valida el rol de la cuenta
-- DUEÑA directamente contra auth.users, algo que esta función ya puede
-- hacer por ser SECURITY DEFINER.

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
    select 1 from ECO.users u
    where u.id = p_owner_id
      and u.status = 'active'
      and (
        u.type = 2
        or (
          u.type = 1
          and exists (
            select 1 from auth.users au
            where au.id = u.auth_user_id
              and coalesce(au.raw_app_meta_data ->> 'role', '') = 'admin'
          )
        )
      )
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
