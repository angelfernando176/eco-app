-- 0006_mobile_business_test.sql — tests pgTAP para alta/edición/baja de
-- negocio desde el móvil, skills móviles y el filtro de lectura pública
-- status='active'. Requiere la extensión pgtap. Ejecutar con:
-- supabase test db
--
-- IMPORTANTE: apunta al esquema "ECO". El esquema "public" pertenece a otro
-- proyecto y no se lee ni se modifica.

begin;
select plan(33);

set search_path to ECO, extensions;

-- ---------------------------------------------------------------------------
-- 1. Columnas nuevas: status (default + check) y columnas opcionales null
-- ---------------------------------------------------------------------------
insert into users (first_name, last_name, age_range, email, type, status)
values ('Mobile', 'Owner', '25-34', 'mobile-owner@test.eco', 2, 'active');

insert into users (first_name, last_name, age_range, email, type, status)
values ('Mobile', 'NullableCols', '25-34', 'mobile-nullable@test.eco', 2, 'active');

insert into businesses (owner_id, trade_name, ruc, phone, latitude, longitude)
select id, 'Negocio Sin Direccion', '222', '098', 1, 1
from users where email = 'mobile-nullable@test.eco';

select is(
  (select status from businesses where trade_name = 'Negocio Sin Direccion'),
  'active',
  'status tiene default active'
);

select is(
  (select representative_email is null and main_street is null and secondary_street is null
     and number is null and reference is null
   from businesses where trade_name = 'Negocio Sin Direccion'),
  true,
  'representative_email/main_street/secondary_street/number/reference admiten null'
);

select throws_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, latitude, longitude, status)
  select id, 'Invalido', '333', '097', 1, 1, 'bogus'
  from users where email = 'mobile-owner@test.eco'
$$, '23514', NULL, 'status rechaza valores fuera de active/inactive');

-- ---------------------------------------------------------------------------
-- 2. register_mobile_business: casos válidos e inválidos
-- ---------------------------------------------------------------------------
insert into users (first_name, last_name, age_range, email, type, status)
values ('Web', 'NotMobile', '25-34', 'web-owner@test.eco', 1, 'active');

insert into users (first_name, last_name, age_range, email, type, status)
values ('Mobile', 'Inactive', '25-34', 'mobile-inactive-owner@test.eco', 2, 'inactive');

select lives_ok($$
  select ECO.register_mobile_business(
    (select id from users where email = 'mobile-owner@test.eco'),
    'Café Móvil', '111', '099', 0, 0, 'abc123', 'Café', 1.5
  )
$$, 'register_mobile_business acepta datos válidos y password con letras y números');

select is(
  (select count(*)::int from businesses where trade_name = 'Café Móvil' and status = 'active'),
  1,
  'register_mobile_business crea el negocio activo'
);

select is(
  (select count(*)::int from products p
   join businesses b on b.id = p.business_id
   where b.trade_name = 'Café Móvil'),
  1,
  'register_mobile_business crea exactamente un producto'
);

select is(
  (select is_primary from products p
   join businesses b on b.id = p.business_id
   where b.trade_name = 'Café Móvil'),
  false,
  'el producto principal del formulario no usa el flag is_primary'
);

select throws_ok($$
  select ECO.register_mobile_business(
    (select id from users where email = 'mobile-owner@test.eco'),
    'Otro Café', '112', '099', 0, 0, 'abcdef', 'Café', 1.5
  )
$$, 'P0001', NULL, 'register_mobile_business rechaza password sin dígitos');

select throws_ok($$
  select ECO.register_mobile_business(
    (select id from users where email = 'mobile-owner@test.eco'),
    'Otro Café', '112', '099', 0, 0, 'abc1', 'Café', 1.5
  )
$$, 'P0001', NULL, 'register_mobile_business rechaza password menor a 6 caracteres');

select throws_ok($$
  select ECO.register_mobile_business(
    (select id from users where email = 'web-owner@test.eco'),
    'Otro Café', '112', '099', 0, 0, 'abc123', 'Café', 1.5
  )
$$, 'P0001', NULL, 'register_mobile_business rechaza un dueño que no es type=2');

select throws_ok($$
  select ECO.register_mobile_business(
    (select id from users where email = 'mobile-inactive-owner@test.eco'),
    'Otro Café', '112', '099', 0, 0, 'abc123', 'Café', 1.5
  )
$$, 'P0001', NULL, 'register_mobile_business rechaza un dueño móvil inactivo');

select throws_ok($$
  select ECO.register_mobile_business(
    gen_random_uuid(),
    'Otro Café', '112', '099', 0, 0, 'abc123', 'Café', 1.5
  )
$$, 'P0001', NULL, 'register_mobile_business rechaza un dueño desconocido');

-- ---------------------------------------------------------------------------
-- 3. update_mobile_business: happy path + rechazo de no-dueño
-- ---------------------------------------------------------------------------
select lives_ok($$
  select ECO.update_mobile_business(
    (select id from businesses where trade_name = 'Café Móvil'),
    (select id from users where email = 'mobile-owner@test.eco'),
    'Café Móvil Editado', '111', '098', 1, 1, 'Café Grande', 2.0
  )
$$, 'update_mobile_business acepta al dueño real');

select is(
  (select trade_name from businesses where ruc = '111' and phone = '098'),
  'Café Móvil Editado',
  'update_mobile_business actualiza los datos del negocio'
);

select is(
  (select name from products p
   join businesses b on b.id = p.business_id
   where b.trade_name = 'Café Móvil Editado'
   order by p.created_at asc limit 1),
  'Café Grande',
  'update_mobile_business actualiza el producto principal (el más antiguo)'
);

select throws_ok($$
  select ECO.update_mobile_business(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    gen_random_uuid(),
    'Hackeado', '111', '098', 1, 1, 'Café Grande', 2.0
  )
$$, 'P0001', NULL, 'update_mobile_business rechaza a un dueño distinto');

-- ---------------------------------------------------------------------------
-- 4. deactivate_mobile_business: baja + encuesta + rechazo de motivo inválido
-- ---------------------------------------------------------------------------
select throws_ok($$
  select ECO.deactivate_mobile_business(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    (select id from users where email = 'mobile-owner@test.eco'),
    'motivo-invalido', ''
  )
$$, 'P0001', NULL, 'deactivate_mobile_business rechaza un motivo fuera de las opciones fijas');

select lives_ok($$
  select ECO.deactivate_mobile_business(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    (select id from users where email = 'mobile-owner@test.eco'),
    'closed', 'Ya no sigo con el negocio'
  )
$$, 'deactivate_mobile_business acepta un motivo válido');

select is(
  (select status from businesses where trade_name = 'Café Móvil Editado'),
  'inactive',
  'deactivate_mobile_business pone el negocio en estado inactive'
);

select is(
  (select count(*)::int from business_deactivation_feedback f
   join businesses b on b.id = f.business_id
   where b.trade_name = 'Café Móvil Editado' and f.reason = 'closed'),
  1,
  'deactivate_mobile_business inserta la fila de encuesta de baja'
);

-- ---------------------------------------------------------------------------
-- 5. get_mobile_business_status: refleja status y suscripción del dueño
-- ---------------------------------------------------------------------------
select is(
  (select status from ECO.get_mobile_business_status(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    (select id from users where email = 'mobile-owner@test.eco')
  )),
  'inactive',
  'get_mobile_business_status refleja el estado inactive'
);

select is(
  (select has_active_subscription from ECO.get_mobile_business_status(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    (select id from users where email = 'mobile-owner@test.eco')
  )),
  false,
  'get_mobile_business_status reporta sin suscripción activa'
);

insert into subscriptions (user_id, status)
select id, 'active' from users where email = 'mobile-owner@test.eco';

select is(
  (select has_active_subscription from ECO.get_mobile_business_status(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    (select id from users where email = 'mobile-owner@test.eco')
  )),
  true,
  'get_mobile_business_status refleja la suscripción activa del dueño'
);

-- ---------------------------------------------------------------------------
-- 6. add_mobile_skill / delete_mobile_skill: límite y propiedad
-- ---------------------------------------------------------------------------
-- Dueño con suscripción activa: límite de 10 (ya tiene suscripción activa de la sección 5).
select lives_ok($$
  select ECO.add_mobile_skill(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    (select id from users where email = 'mobile-owner@test.eco'),
    'wifi-gratis'
  )
$$, 'add_mobile_skill acepta al dueño real');

select is(
  (select count(*)::int from skills s
   join businesses b on b.id = s.business_id
   where b.trade_name = 'Café Móvil Editado' and s.name = 'wifi-gratis'),
  1,
  'add_mobile_skill inserta la skill'
);

select throws_ok($$
  select ECO.add_mobile_skill(
    (select id from businesses where trade_name = 'Café Móvil Editado'),
    gen_random_uuid(),
    'otra-skill'
  )
$$, 'P0001', NULL, 'add_mobile_skill rechaza a un dueño distinto');

select lives_ok($$
  select ECO.delete_mobile_skill(
    (select s.id from skills s
     join businesses b on b.id = s.business_id
     where b.trade_name = 'Café Móvil Editado' and s.name = 'wifi-gratis'),
    (select id from users where email = 'mobile-owner@test.eco')
  )
$$, 'delete_mobile_skill acepta al dueño real');

select is(
  (select count(*)::int from skills s
   join businesses b on b.id = s.business_id
   where b.trade_name = 'Café Móvil Editado' and s.name = 'wifi-gratis'),
  0,
  'delete_mobile_skill borra la skill'
);

select throws_ok($$
  select ECO.delete_mobile_skill(gen_random_uuid(), (select id from users where email = 'mobile-owner@test.eco'))
$$, 'P0001', NULL, 'delete_mobile_skill rechaza una skill desconocida');

-- Sin suscripción (otro negocio, dueño sin suscripción): el límite de 1 sigue
-- aplicando a la skill móvil (trigger de 0001/0004, sin cambios en esta migración).
insert into users (first_name, last_name, age_range, email, type, status)
values ('Mobile', 'NoSub', '25-34', 'mobile-nosub@test.eco', 2, 'active');

select ECO.register_mobile_business(
  (select id from users where email = 'mobile-nosub@test.eco'),
  'Negocio Sin Sub', '444', '096', 2, 2, 'abc123', 'Producto', 1
);

select lives_ok($$
  select ECO.add_mobile_skill(
    (select id from businesses where trade_name = 'Negocio Sin Sub'),
    (select id from users where email = 'mobile-nosub@test.eco'),
    'primera-skill'
  )
$$, 'add_mobile_skill acepta la primera skill sin suscripción');

select throws_ok($$
  select ECO.add_mobile_skill(
    (select id from businesses where trade_name = 'Negocio Sin Sub'),
    (select id from users where email = 'mobile-nosub@test.eco'),
    'segunda-skill'
  )
$$, 'P0001', NULL, 'add_mobile_skill respeta el límite de 1 skill sin suscripción');

-- ---------------------------------------------------------------------------
-- 7. Lectura pública: status='active' filtra negocios dados de baja
-- ---------------------------------------------------------------------------
set local role anon;

select is(
  (select count(*)::int from businesses where trade_name = 'Café Móvil Editado'),
  0,
  'anon no ve un negocio inactivo en la lectura pública'
);

select is(
  (select count(*)::int from businesses where trade_name = 'Negocio Sin Sub'),
  1,
  'anon sigue viendo un negocio activo en la lectura pública'
);

reset role;

select * from finish();
rollback;
