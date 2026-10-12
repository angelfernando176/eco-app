-- 0007_admin_mobile_password_test.sql — tests pgTAP para
-- ECO.admin_set_business_password. Requiere la extensión pgtap. Ejecutar
-- con: supabase test db
--
-- IMPORTANTE: apunta al esquema "ECO". El esquema "public" pertenece a otro
-- proyecto y no se lee ni se modifica.

begin;
select plan(7);

set search_path to ECO, extensions;

insert into users (first_name, last_name, age_range, email, type, status)
values ('Mobile', 'Owner', '25-34', 'mobile-admin-pw@test.eco', 2, 'active');

insert into businesses (owner_id, trade_name, ruc, phone, latitude, longitude, password_hash)
select id, 'Negocio Admin PW', '111', '099', 0, 0, extensions.crypt('oldpass1', extensions.gen_salt('bf'))
from users where email = 'mobile-admin-pw@test.eco';

-- ---------------------------------------------------------------------------
-- 1. Sin sesión admin: rechazado
-- ---------------------------------------------------------------------------
select throws_ok($$
  select ECO.admin_set_business_password(
    (select id from businesses where trade_name = 'Negocio Admin PW'),
    'newpass1'
  )
$$, 'P0001', 'only an administrator can reset a business password', 'anon rechazado sin sesión admin');

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000e1"}';

select throws_ok($$
  select ECO.admin_set_business_password(
    (select id from businesses where trade_name = 'Negocio Admin PW'),
    'newpass1'
  )
$$, 'P0001', 'only an administrator can reset a business password', 'authenticated sin rol admin rechazado');

-- ---------------------------------------------------------------------------
-- 2. Con sesión admin: negocio inexistente rechazado
-- ---------------------------------------------------------------------------
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-0000000000e2","app_metadata":{"role":"admin"}}';

select throws_ok($$
  select ECO.admin_set_business_password('00000000-0000-0000-0000-000000000000', 'newpass1')
$$, 'P0001', 'unknown business', 'admin rechazado para negocio inexistente');

-- ---------------------------------------------------------------------------
-- 3. Con sesión admin: password débil rechazada
-- ---------------------------------------------------------------------------
select throws_ok($$
  select ECO.admin_set_business_password(
    (select id from businesses where trade_name = 'Negocio Admin PW'),
    'abc'
  )
$$, 'P0001', 'password must be at least 6 characters and contain letters and numbers', 'admin rechazado por password débil');

select throws_ok($$
  select ECO.admin_set_business_password(
    (select id from businesses where trade_name = 'Negocio Admin PW'),
    '123456'
  )
$$, 'P0001', 'password must be at least 6 characters and contain letters and numbers', 'admin rechazado por password sin letras');

-- ---------------------------------------------------------------------------
-- 4. Con sesión admin: password válida aplicada (hash cambia y valida)
-- ---------------------------------------------------------------------------
select lives_ok($$
  select ECO.admin_set_business_password(
    (select id from businesses where trade_name = 'Negocio Admin PW'),
    'newpass1'
  )
$$, 'admin resetea password con datos válidos');

select is(
  (select password_hash = extensions.crypt('newpass1', password_hash) from businesses where trade_name = 'Negocio Admin PW'),
  true,
  'password_hash refleja la nueva password'
);

select * from finish();
rollback;
