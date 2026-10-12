-- 0007_admin_mobile_password.sql — Reseteo de password de negocio por el
-- Administrador desde la app móvil.
--
-- Contexto: con sesión de Supabase Auth autenticada como admin (claim JWT
-- app_metadata.role = 'admin'), las políticas RLS ya existentes
-- (businesses_select_public, businesses_update_own_or_admin,
-- skills_*_owner_or_admin, products_*_owner_or_admin de 0002/0004/0006)
-- permiten que el admin lea y edite directamente cualquier negocio, producto
-- o skill. Solo falta una pieza: el hash de password requiere `crypt()`, que
-- no puede invocarse desde un UPDATE plano del cliente. Esta función resuelve
-- únicamente eso, con su propia guarda de rol (no depende de `owner_id`).

create or replace function ECO.admin_set_business_password(
  p_business_id uuid,
  p_new_password text
)
returns void
language plpgsql security definer set search_path = ECO, extensions as $$
begin
  if not ECO.is_admin() then
    raise exception 'only an administrator can reset a business password';
  end if;

  if not exists (select 1 from ECO.businesses where id = p_business_id) then
    raise exception 'unknown business';
  end if;

  if length(p_new_password) < 6
     or p_new_password !~ '[A-Za-z]'
     or p_new_password !~ '[0-9]'
  then
    raise exception 'password must be at least 6 characters and contain letters and numbers';
  end if;

  update ECO.businesses
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  where id = p_business_id;
end;
$$;

revoke execute on function ECO.admin_set_business_password(uuid, text) from public;
grant execute on function ECO.admin_set_business_password(uuid, text) to authenticated;
