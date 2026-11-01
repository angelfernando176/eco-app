-- 0010_mobile_account_gender.sql — Campo "género" en cuentas móviles.
--
-- Igual que las migraciones previas, todo vive en el esquema "ECO".
--
-- Valores: 1 = Masculino, 2 = Femenino, 3 = Otro. Obligatorio para altas
-- nuevas vía `register_mobile_account` (validado server-side); nullable a
-- nivel de columna porque las cuentas existentes no lo tienen.

alter table ECO.users
  add column if not exists gender smallint;

alter table ECO.users
  drop constraint if exists users_gender_check;

alter table ECO.users
  add constraint users_gender_check check (gender is null or gender in (1, 2, 3));

create or replace function ECO.register_mobile_account(
  p_first_name text,
  p_age_range text,
  p_email text,
  p_password text,
  p_gender integer
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

  if p_gender is null or p_gender not in (1, 2, 3) then
    raise exception 'invalid gender: %', p_gender;
  end if;

  insert into ECO.users (first_name, last_name, age_range, email, type, status, auth_user_id, password_hash, gender)
  values (v_first_name, '', p_age_range, v_email, 2, 'active', null, extensions.crypt(p_password, extensions.gen_salt('bf')), p_gender)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function ECO.register_mobile_account(text, text, text, text) from public, anon, authenticated, service_role;
drop function if exists ECO.register_mobile_account(text, text, text, text);

revoke execute on function ECO.register_mobile_account(text, text, text, text, integer) from public;
grant execute on function ECO.register_mobile_account(text, text, text, text, integer) to anon, authenticated, service_role;
