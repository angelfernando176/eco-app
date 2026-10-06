-- 0005_mobile_test.sql — tests pgTAP para el RPC móvil (registro, calificaciones)
-- y la privacidad de `ratings`. Requiere la extensión pgtap. Ejecutar con:
-- supabase test db
--
-- IMPORTANTE: apunta al esquema "ECO". El esquema "public" pertenece a otro
-- proyecto y no se lee ni se modifica.

begin;
select plan(25);

set search_path to ECO, extensions;

-- ---------------------------------------------------------------------------
-- 1. register_mobile_user: casos válidos e inválidos
-- ---------------------------------------------------------------------------
select lives_ok($$
  select ECO.register_mobile_user('Ana', '25-34')
$$, 'register_mobile_user acepta nombre y rango válidos');

select is(
  (select count(*)::int from users where first_name = 'Ana' and type = 2 and status = 'active'),
  1,
  'register_mobile_user crea un usuario móvil activo'
);

select throws_ok($$
  select ECO.register_mobile_user('A', '25-34')
$$, 'P0001', NULL, 'register_mobile_user rechaza nombre menor a 2 caracteres');

select throws_ok($$
  select ECO.register_mobile_user(repeat('x', 51), '25-34')
$$, 'P0001', NULL, 'register_mobile_user rechaza nombre mayor a 50 caracteres');

select throws_ok($$
  select ECO.register_mobile_user('Ana', '10-17')
$$, 'P0001', NULL, 'register_mobile_user rechaza un rango de edad inválido');

-- ---------------------------------------------------------------------------
-- 2. submit_rating: datos base
-- ---------------------------------------------------------------------------
-- auth.users dispara handle_new_user(): crea el perfil automáticamente (type=1);
-- completamos los campos que el trigger deja vacíos en vez de insertar un
-- segundo perfil con el mismo auth_user_id (necesitamos el enlace de auth desde
-- el inicio para la sección 4: dueño/admin leyendo ratings directamente).
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'owner@test.eco');
update users set first_name = 'Web', last_name = 'Owner', age_range = '35-44'
where auth_user_id = '00000000-0000-0000-0000-0000000000e1';

insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
  latitude, longitude, main_street, secondary_street, number, reference)
select id, 'Café Móvil', '111', '099', 'owner@test.eco', 0, 0, 'A', 'B', '1', 'R'
from users where email = 'owner@test.eco';

insert into users (first_name, last_name, age_range, email, type, status)
values ('Mobile', 'Active', '18-24', 'mobile-active@test.eco', 2, 'active');

insert into users (first_name, last_name, age_range, email, type, status)
values ('Mobile', 'Inactive', '18-24', 'mobile-inactive@test.eco', 2, 'inactive');

insert into users (first_name, last_name, age_range, email, type, status)
values ('Web', 'NotMobile', '18-24', 'webuser@test.eco', 1, 'active');

select lives_ok($$
  select ECO.submit_rating(
    (select id from users where email = 'mobile-active@test.eco'),
    (select id from businesses where representative_email = 'owner@test.eco'),
    5::smallint,
    'Excelente atención'
  )
$$, 'submit_rating acepta un usuario móvil activo, negocio existente y rating válido');

select throws_ok($$
  select ECO.submit_rating(
    (select id from users where email = 'mobile-active@test.eco'),
    (select id from businesses where representative_email = 'owner@test.eco'),
    6::smallint,
    ''
  )
$$, 'P0001', NULL, 'submit_rating rechaza un rating fuera de 1..5');

select throws_ok($$
  select ECO.submit_rating(
    (select id from users where email = 'mobile-inactive@test.eco'),
    (select id from businesses where representative_email = 'owner@test.eco'),
    4::smallint,
    ''
  )
$$, 'P0001', NULL, 'submit_rating rechaza un usuario móvil inactivo');

select throws_ok($$
  select ECO.submit_rating(
    (select id from users where email = 'webuser@test.eco'),
    (select id from businesses where representative_email = 'owner@test.eco'),
    4::smallint,
    ''
  )
$$, 'P0001', NULL, 'submit_rating rechaza un usuario que no es de tipo móvil (type=1)');

select throws_ok($$
  select ECO.submit_rating(
    (select id from users where email = 'mobile-active@test.eco'),
    gen_random_uuid(),
    4::smallint,
    ''
  )
$$, 'P0001', NULL, 'submit_rating rechaza un negocio desconocido');

select throws_ok($$
  select ECO.submit_rating(
    (select id from users where email = 'mobile-active@test.eco'),
    (select id from businesses where representative_email = 'owner@test.eco'),
    4::smallint,
    repeat('x', 501)
  )
$$, 'P0001', NULL, 'submit_rating rechaza un comentario mayor a 500 caracteres');

-- ---------------------------------------------------------------------------
-- 3. Privacidad de ratings: anon/autenticado sin permiso no leen la tabla
-- ---------------------------------------------------------------------------
set local role anon;

-- RLS no lanza excepción en SELECT/UPDATE/DELETE: simplemente filtra las filas
-- que la política USING no autoriza (0 filas visibles/afectadas para anon).
select is(
  (select count(*)::int from users),
  0,
  'anon no lee ninguna fila de ECO.users directamente (RLS filtra todo)'
);

select is(
  (select count(*)::int from ratings),
  0,
  'anon no lee ninguna fila de ECO.ratings directamente (RLS filtra todo)'
);

-- INSERT sí lanza excepción: el WITH CHECK falla para toda la fila nueva.
select throws_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  values (gen_random_uuid(), 'Intruso', '999', '099', 'x@test.eco', 0, 0, 'A', 'B', '1', 'R')
$$, '42501', NULL, 'anon no inserta negocios directamente');

update businesses set trade_name = 'Hackeado';
select is(
  (select count(*)::int from businesses where trade_name = 'Hackeado'),
  0,
  'anon no actualiza ninguna fila de businesses (RLS filtra todo)'
);

delete from businesses;
select is(
  (select count(*)::int from businesses where representative_email = 'owner@test.eco'),
  1,
  'anon no borra ninguna fila de businesses (RLS filtra todo)'
);

-- anon puede leer negocios y llamar a las RPC de solo lectura
select is(
  (select count(*)::int from businesses where representative_email = 'owner@test.eco'),
  1,
  'anon lee businesses (SELECT público)'
);

select lives_ok($$
  select * from ECO.list_business_ratings(
    (select id from businesses where representative_email = 'owner@test.eco')
  )
$$, 'anon puede llamar a list_business_ratings');

select is(
  (select count(*)::int from ECO.list_business_ratings(
    (select id from businesses where representative_email = 'owner@test.eco')
  )),
  1,
  'list_business_ratings devuelve la calificación registrada'
);

select is(
  (select reviewer_name from ECO.list_business_ratings(
    (select id from businesses where representative_email = 'owner@test.eco')
  ) limit 1),
  'Mobile',
  'list_business_ratings expone solo el nombre del reseñador (sin ids)'
);

select lives_ok($$
  select * from ECO.business_rating_summary(
    (select id from businesses where representative_email = 'owner@test.eco')
  )
$$, 'anon puede llamar a business_rating_summary');

select is(
  (select total from ECO.business_rating_summary(
    (select id from businesses where representative_email = 'owner@test.eco')
  )),
  1,
  'business_rating_summary cuenta la calificación registrada'
);

reset role;

-- ---------------------------------------------------------------------------
-- 4. Dueño y administrador siguen leyendo ratings directamente
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e2', 'otro-web@test.eco');
update users set first_name = 'Otro', last_name = 'Web', age_range = '25-34'
where auth_user_id = '00000000-0000-0000-0000-0000000000e2';

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000e1"}';

select is(
  (select count(*)::int from ratings r
   join businesses b on b.id = r.business_id
   where b.representative_email = 'owner@test.eco'),
  1,
  'el dueño del negocio lee sus ratings directamente'
);

reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000e2"}';

select is(
  (select count(*)::int from ratings r
   join businesses b on b.id = r.business_id
   where b.representative_email = 'owner@test.eco'),
  0,
  'otro usuario web (no dueño) no lee los ratings del negocio'
);

reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000e3","app_metadata":{"role":"admin"}}';

select is(
  (select count(*)::int from ratings r
   join businesses b on b.id = r.business_id
   where b.representative_email = 'owner@test.eco'),
  1,
  'el administrador lee cualquier rating directamente'
);

reset role;

select * from finish();
rollback;
