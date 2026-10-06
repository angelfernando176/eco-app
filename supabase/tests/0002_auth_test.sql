-- 0002_auth_test.sql — tests pgTAP para autenticación y RLS por rol.
-- Requiere la extensión pgtap y un proyecto Supabase local (supabase test db).
--
-- IMPORTANTE: apunta al esquema "ECO". El esquema "public" pertenece a otro
-- proyecto y no se lee ni se modifica.

begin;
select plan(15);

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
  1::smallint,
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
-- auth.users dispara handle_new_user(): crea el perfil automáticamente (type=1);
-- solo completamos los campos que el trigger deja vacíos, en vez de insertar un
-- segundo perfil con el mismo auth_user_id (duplicaría la fila que resuelve
-- current_user_id()).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b1', 'web@test.eco');
update users set first_name = 'Web', last_name = 'Owner', age_range = '25-34'
where auth_user_id = '00000000-0000-0000-0000-0000000000b1';

insert into users (id, first_name, last_name, age_range, email, type)
values ('00000000-0000-0000-0000-0000000000f1', 'Mob', 'User', '35-44', 'mob@test.eco', 2);

-- Dueño ajeno sin negocios: el trigger de límite (BEFORE INSERT) corre antes que RLS, así que
-- para ejercitar la política WITH CHECK el dueño destino no debe tener ya su negocio permitido.
insert into users (id, first_name, last_name, age_range, email, type)
values ('00000000-0000-0000-0000-0000000000f2', 'Otro', 'Dueño', '25-34', 'otro@test.eco', 1);

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
  values ('00000000-0000-0000-0000-0000000000f2', 'Ajeno', '333', '099', 'ajeno@test.eco', 0, 0, 'E', 'F', '3', 'T')
$$, '42501', NULL, 'web_user no inserta negocios de otro dueño');

select lives_ok($$
  update businesses set trade_name = 'Café Web Editado'
  where representative_email = 'web@test.eco'
$$, 'web_user edita su propio negocio');

-- Sin política DELETE aplicable, Postgres no lanza error: filtra y borra 0 filas.
delete from businesses where representative_email = 'web@test.eco';
select is(
  (select count(*)::int from businesses where representative_email = 'web@test.eco'),
  1,
  'web_user no borra negocios (solo admin)'
);

-- Plan sin suscripción (0004): el dueño puede crear su único producto, no un segundo.
select lives_ok($$
  insert into products (business_id, name)
  select id, 'Producto gratis'
  from businesses where representative_email = 'web@test.eco'
$$, 'web_user sin suscripción crea su único producto');

select throws_ok($$
  insert into products (business_id, name)
  select id, 'Segundo producto'
  from businesses where representative_email = 'web@test.eco'
$$, 'P0001', NULL, 'web_user sin suscripción no crea un segundo producto');

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
  values ('00000000-0000-0000-0000-0000000000f2', 'Sin perfil', '444', '099', 'x@test.eco', 0, 0, 'G', 'H', '4', 'U')
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
