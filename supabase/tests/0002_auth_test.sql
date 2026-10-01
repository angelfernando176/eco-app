-- 0002_auth_test.sql — tests pgTAP para autenticación y RLS por rol.
-- Requiere la extensión pgtap y un proyecto Supabase local (supabase test db).
--
-- IMPORTANTE: apunta al esquema "ECO". El esquema "public" pertenece a otro
-- proyecto y no se lee ni se modifica.

begin;
select plan(14);

set search_path to ECO, extensions;

-- ---------------------------------------------------------------------------
-- 1. handle_new_user: crea el perfil en ECO.users al registrarse en Auth
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000000a1', 'nuevo@test.eco',
        '{"first_name":"Nuevo","last_name":"User","age_range":"18-24"}');

select is(
  (select count(*)::int from users where email = 'nuevo@test.eco'),
  1,
  'handle_new_user crea el perfil al registrarse'
);

select is(
  (select type from users where email = 'nuevo@test.eco'),
  1,
  'perfil creado con type = 1 (web/escritorio)'
);

select is(
  (select auth_user_id::text from users where email = 'nuevo@test.eco'),
  '00000000-0000-0000-0000-0000000000a1',
  'perfil enlaza auth_user_id con auth.users'
);

-- ---------------------------------------------------------------------------
-- 2. Helpers sin claims de Auth
-- ---------------------------------------------------------------------------
select is(ECO.is_admin(), false, 'is_admin() es false sin claim de rol');
select is(ECO.current_user_id() is null, true, 'current_user_id() es null sin auth');

-- ---------------------------------------------------------------------------
-- 3. Datos base para RLS
-- ---------------------------------------------------------------------------
-- web_user (dueño autenticado) y mobile_user (type=2, sin cuenta Auth).
insert into users (auth_user_id, first_name, last_name, age_range, email, type)
values ('00000000-0000-0000-0000-0000000000b1', 'Web', 'Owner', '25-34', 'web@test.eco', 1);

insert into users (first_name, last_name, age_range, email, type)
values ('Mob', 'User', '35-44', 'mob@test.eco', 2);

-- Un negocio de otro dueño para probar la lectura pública.
insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
  latitude, longitude, main_street, secondary_street, number, reference)
select id, 'Café Mobile', '111', '099', 'mob@test.eco', 0, 0, 'A', 'B', '1', 'R'
from users where email = 'mob@test.eco';

-- ---------------------------------------------------------------------------
-- 4. RLS como usuario web/escritorio (autenticado, dueño)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b1"}';

select is(
  (select count(*)::int from businesses),
  1,
  'web_user lee negocios (SELECT público)'
);

select lives_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  select id, 'Café Web', '222', '099', 'web@test.eco', 0, 0, 'C', 'D', '2', 'S'
  from users where email = 'web@test.eco'
$$, 'web_user inserta su propio negocio');

select throws_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  select id, 'Ajeno', '333', '099', 'ajeno@test.eco', 0, 0, 'E', 'F', '3', 'T'
  from users where email = 'mob@test.eco'
$$, '42501', NULL, 'web_user no inserta negocios de otro dueño');

select lives_ok($$
  update businesses set trade_name = 'Café Web Editado'
  where representative_email = 'web@test.eco'
$$, 'web_user edita su propio negocio');

select throws_ok($$
  delete from businesses where representative_email = 'web@test.eco'
$$, '42501', NULL, 'web_user no borra negocios (solo admin)');

select throws_ok($$
  insert into products (business_id, name)
  select id, 'Producto sin suscripción'
  from businesses where representative_email = 'web@test.eco'
$$, '42501', NULL, 'web_user sin suscripción no gestiona el menú');

reset role;

-- Activar suscripción (como superuser) y reintentar la gestión del menú.
insert into subscriptions (user_id, status)
select id, 'active' from users where email = 'web@test.eco';

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000b1"}';

select lives_ok($$
  insert into products (business_id, name)
  select id, 'Producto con suscripción'
  from businesses where representative_email = 'web@test.eco'
$$, 'web_user con suscripción gestiona el menú');

reset role;

-- ---------------------------------------------------------------------------
-- 5. Autenticado sin perfil (no puede escribir negocios)
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000c1"}';

select throws_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  select id, 'Sin perfil', '444', '099', 'x@test.eco', 0, 0, 'G', 'H', '4', 'U'
  from users where email = 'web@test.eco'
$$, '42501', NULL, 'autenticado sin perfil no escribe negocios');

reset role;

-- ---------------------------------------------------------------------------
-- 6. Administrador (claim role=admin): borrado global
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000d1","app_metadata":{"role":"admin"}}';

select lives_ok($$
  delete from businesses where representative_email = 'mob@test.eco'
$$, 'admin borra cualquier negocio');

reset role;

select * from finish();
rollback;
