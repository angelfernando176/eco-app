-- 0005_mobile.sql — App móvil: registro ligero, calificaciones y privacidad de ratings.
--
-- IMPORTANTE: igual que en las migraciones previas, todo vive en el esquema "ECO".
-- El esquema "public" pertenece a OTRO proyecto y no se lee ni se modifica.
--
-- El usuario móvil no tiene cuenta de Auth: opera como `anon`. Las escrituras
-- (alta de perfil y calificación) pasan por RPC SECURITY DEFINER, validadas
-- server-side. La lectura de `ratings` deja de ser pública (expone mobile_user_id):
-- se reemplaza por RPCs de solo lectura sin ids (`list_business_ratings`,
-- `business_rating_summary`); admin y dueño siguen leyendo la tabla directamente.
-- Idempotente.

-- ---------------------------------------------------------------------------
-- 1. Alta de perfil móvil (sin cuenta de Auth)
-- ---------------------------------------------------------------------------
create or replace function ECO.register_mobile_user(p_first_name text, p_age_range text)
returns uuid
language plpgsql security definer set search_path = ECO, extensions as $$
declare
  v_first_name text;
  v_id uuid;
begin
  v_first_name := trim(coalesce(p_first_name, ''));
  if length(v_first_name) < 2 or length(v_first_name) > 50 then
    raise exception 'first name must be between 2 and 50 characters';
  end if;

  if p_age_range is null or p_age_range not in ('18-24', '25-34', '35-44', '45-54', '55-64', '65+') then
    raise exception 'invalid age range: %', p_age_range;
  end if;

  insert into ECO.users (first_name, last_name, age_range, email, type, status, auth_user_id)
  values (v_first_name, '', p_age_range, null, 2, 'active', null)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Calificar un negocio (usuario móvil activo, type = 2)
-- ---------------------------------------------------------------------------
create or replace function ECO.submit_rating(
  p_mobile_user_id uuid,
  p_business_id uuid,
  p_rating smallint,
  p_comment text default ''
)
returns uuid
language plpgsql security definer set search_path = ECO, extensions as $$
declare
  v_comment text;
  v_id uuid;
begin
  if not exists (
    select 1 from ECO.users
    where id = p_mobile_user_id and type = 2 and status = 'active'
  ) then
    raise exception 'unknown or inactive mobile user';
  end if;

  if not exists (select 1 from ECO.businesses where id = p_business_id) then
    raise exception 'unknown business';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  v_comment := trim(coalesce(p_comment, ''));
  if length(v_comment) > 500 then
    raise exception 'comment must be at most 500 characters';
  end if;

  insert into ECO.ratings (business_id, mobile_user_id, rating, comment)
  values (p_business_id, p_mobile_user_id, p_rating, v_comment)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Privacidad de ratings: solo admin o dueño leen la tabla directamente.
--    La app móvil consulta vía RPC (sin ids).
-- ---------------------------------------------------------------------------
drop policy if exists ratings_select_public on ECO.ratings;

drop policy if exists ratings_select_admin_or_owner on ECO.ratings;
create policy ratings_select_admin_or_owner on ECO.ratings
  for select using (ECO.is_admin() or ECO.owns_business(business_id));

create or replace function ECO.list_business_ratings(
  p_business_id uuid,
  p_limit int default 50,
  p_offset int default 0
)
returns table(rating smallint, comment text, created_at timestamptz, reviewer_name text)
language sql stable security definer set search_path = ECO, extensions as $$
  select r.rating, r.comment, r.created_at, u.first_name as reviewer_name
  from ECO.ratings r
  join ECO.users u on u.id = r.mobile_user_id
  where r.business_id = p_business_id
  order by r.created_at desc
  limit greatest(least(coalesce(p_limit, 50), 100), 0)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function ECO.business_rating_summary(p_business_id uuid)
returns table(average numeric, total int)
language sql stable security definer set search_path = ECO, extensions as $$
  select coalesce(round(avg(rating), 1), 0), coalesce(count(*)::int, 0)
  from ECO.ratings
  where business_id = p_business_id
$$;

-- ---------------------------------------------------------------------------
-- 4. Permisos: solo ejecución explícita de las RPC (sin escritura directa para anon).
-- ---------------------------------------------------------------------------
revoke execute on function ECO.register_mobile_user(text, text) from public;
revoke execute on function ECO.submit_rating(uuid, uuid, smallint, text) from public;
revoke execute on function ECO.list_business_ratings(uuid, int, int) from public;
revoke execute on function ECO.business_rating_summary(uuid) from public;

grant execute on function ECO.register_mobile_user(text, text) to anon, authenticated, service_role;
grant execute on function ECO.submit_rating(uuid, uuid, smallint, text) to anon, authenticated, service_role;
grant execute on function ECO.list_business_ratings(uuid, int, int) to anon, authenticated, service_role;
grant execute on function ECO.business_rating_summary(uuid) to anon, authenticated, service_role;
