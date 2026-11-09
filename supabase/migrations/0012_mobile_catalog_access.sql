-- 0012_mobile_catalog_access.sql — El límite de skills (1 sin suscripción,
-- 10 con suscripción activa) debe aplicar también cuando quien agrega el
-- skill es una cuenta admin (antes exenta vía ECO.is_admin() en el trigger
-- skills_enforce_limit de 0001/0004: una sesión admin real —vía
-- signInAsAdmin en el móvil— sí trae JWT con is_admin() = true, así que
-- quedaba sin límite). Además, agrega las RPC `add_mobile_product` /
-- `delete_mobile_product` que le faltaban al negocio móvil (mismo patrón
-- security definer que add_mobile_skill/delete_mobile_skill de 0006): la
-- pestaña "Producto" de la pantalla "Editar negocio" los necesita para
-- alta/baja rápida (nombre; price/description quedan en su default). El
-- límite de productos (products_enforce_limit, 0004) sigue exento para
-- admin sin cambios: no fue parte de lo pedido.

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

create or replace function ECO.add_mobile_product(p_business_id uuid, p_owner_id uuid, p_name text)
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
  if length(v_name) < 1 or length(v_name) > 100 then
    raise exception 'product name must be between 1 and 100 characters';
  end if;

  insert into ECO.products (business_id, name, price, is_primary, is_secondary)
  values (p_business_id, v_name, 0, false, false)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function ECO.delete_mobile_product(p_product_id uuid, p_owner_id uuid)
returns void
language plpgsql security definer set search_path = ECO, extensions as $$
begin
  if not exists (
    select 1 from ECO.products p
    join ECO.businesses b on b.id = p.business_id
    where p.id = p_product_id and b.owner_id = p_owner_id
  ) then
    raise exception 'unknown or not owned product';
  end if;

  delete from ECO.products where id = p_product_id;
end;
$$;

revoke execute on function ECO.add_mobile_product(uuid, uuid, text) from public;
revoke execute on function ECO.delete_mobile_product(uuid, uuid) from public;

grant execute on function ECO.add_mobile_product(uuid, uuid, text) to anon, authenticated, service_role;
grant execute on function ECO.delete_mobile_product(uuid, uuid) to anon, authenticated, service_role;
