-- 0008_mobile_accounts.sql — Cuentas móviles con email + clave (alta y
-- verificación), base para unificar rol (sin suscripción/con suscripción/
-- admin) detrás de un solo mecanismo de verificación.
--
-- IMPORTANTE: igual que en las migraciones previas, todo vive en el esquema "ECO".
-- El esquema "public" pertenece a OTRO proyecto y no se lee ni se modifica.
--
-- `register_mobile_account` reemplaza a `register_mobile_user` (0005) para
-- altas nuevas: ahora exige email + clave. El usuario móvil sigue sin cuenta
-- de Auth (opera como `anon`); la clave se hashea server-side (mismo patrón
-- que `register_mobile_business`, 0006) y nunca se confía en el cliente.
-- `verify_mobile_password` es una RPC de solo lectura usada por la Edge
-- Function `eco-mobile-verify-account` para comparar la clave vía
-- `extensions.crypt` sin exponer `password_hash` ni hacer la comparación en
-- la app. Idempotente.

-- ---------------------------------------------------------------------------
-- 1. Columna nueva en ECO.users: password_hash (solo para type = 2; las
--    cuentas web/admin siguen usando Supabase Auth, no esta columna).
-- ---------------------------------------------------------------------------
alter table ECO.users
  add column if not exists password_hash text;

-- ---------------------------------------------------------------------------
-- 2. Alta de cuenta móvil con email + clave.
-- ---------------------------------------------------------------------------
create or replace function ECO.register_mobile_account(
  p_first_name text,
  p_age_range text,
  p_email text,
  p_password text
)
returns uuid
language plpgsql security definer set search_path = ECO, extensions as $$
declare
  v_first_name text;
  v_email text;
  v_id uuid;
begin
  v_first_name := trim(coalesce(p_first_name, ''));
  if length(v_first_name) < 2 or length(v_first_name) > 50 then
    raise exception 'first name must be between 2 and 50 characters';
  end if;

  if p_age_range is null or p_age_range not in ('18-24', '25-34', '35-44', '45-54', '55-64', '65+') then
    raise exception 'invalid age range: %', p_age_range;
  end if;

  v_email := lower(trim(coalesce(p_email, '')));
  if length(v_email) = 0 or length(v_email) > 255 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email address';
  end if;

  if exists (select 1 from ECO.users where lower(email) = v_email) then
    raise exception 'an account with this email already exists, please log in instead';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'an account with this email already exists, please log in instead';
  end if;

  if p_password is null
     or length(p_password) < 6
     or p_password !~ '[A-Za-z]'
     or p_password !~ '[0-9]'
  then
    raise exception 'password must be at least 6 characters and contain letters and numbers';
  end if;

  insert into ECO.users (first_name, last_name, age_range, email, type, status, auth_user_id, password_hash)
  values (v_first_name, '', p_age_range, v_email, 2, 'active', null, extensions.crypt(p_password, extensions.gen_salt('bf')))
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Verificación de clave móvil (solo lectura, sin exponer password_hash).
--    Usada por la Edge Function eco-mobile-verify-account cuando el email no
--    corresponde a una cuenta de Supabase Auth.
-- ---------------------------------------------------------------------------
create or replace function ECO.verify_mobile_password(p_email text, p_password text)
returns table(id uuid, first_name text, matched boolean)
language sql stable security definer set search_path = ECO, extensions as $$
  select u.id, u.first_name, (u.password_hash is not null and extensions.crypt(p_password, u.password_hash) = u.password_hash) as matched
  from ECO.users u
  where u.type = 2 and lower(u.email) = lower(trim(coalesce(p_email, '')))
$$;

-- ---------------------------------------------------------------------------
-- 4. Permisos: solo ejecución explícita de las RPC (sin escritura directa para anon).
-- ---------------------------------------------------------------------------
revoke execute on function ECO.register_mobile_account(text, text, text, text) from public;
revoke execute on function ECO.verify_mobile_password(text, text) from public;

grant execute on function ECO.register_mobile_account(text, text, text, text) to anon, authenticated, service_role;
grant execute on function ECO.verify_mobile_password(text, text) to anon, authenticated, service_role;
