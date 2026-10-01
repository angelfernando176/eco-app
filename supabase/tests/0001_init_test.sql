-- 0001_init_test.sql — tests pgTAP para el esquema base de ECO.
-- Requiere la extensión pgtap. Ejecutar con: supabase test db

begin;
select plan(11);

-- datos base
insert into users (first_name, last_name, age_range, type, email)
values ('Ana', 'Test', '25-34', 2, 'ana@test.eco');

-- 1. users.type in (1, 2)
select throws_ok($$
  insert into users (first_name, last_name, age_range, type)
  values ('Bad', 'Type', '25-34', 3)
$$, '23514', NULL, 'users.type rechaza 3');

-- 2. users.status in (active, inactive)
select throws_ok($$
  insert into users (first_name, last_name, age_range, type, status)
  values ('Bad', 'Status', '25-34', 1, 'banned')
$$, '23514', NULL, 'users.status rechaza banned');

-- negocio de prueba
insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
  latitude, longitude, main_street, secondary_street, number, reference)
select id, 'Café ECO', '11111111111', '099', 'cafe@test.eco', -0.18, -78.5,
  'Av A', 'Calle B', '1', 'Ref'
from users where email = 'ana@test.eco';

-- 3. businesses: máximo 1 sin suscripción activa
select throws_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  select id, 'Otro', '22222222222', '099', 'otro@test.eco', 0, 0, 'A', 'B', '1', 'X'
  from users where email = 'ana@test.eco'
$$, 'P0001', NULL, 'businesses: máx 1 sin suscripción activa');

-- 4. ratings.rating in 1..5
select throws_ok($$
  insert into ratings (business_id, mobile_user_id, rating)
  select b.id, u.id, 6 from businesses b, users u
  where b.representative_email = 'cafe@test.eco' and u.email = 'ana@test.eco'
$$, '23514', NULL, 'ratings.rating rechaza 6');

-- 5. skills: máximo 1 sin suscripción activa
insert into skills (business_id, name)
select id, 'café' from businesses where representative_email = 'cafe@test.eco';
select throws_ok($$
  insert into skills (business_id, name)
  select id, 'postres' from businesses where representative_email = 'cafe@test.eco'
$$, 'P0001', NULL, 'skills: máx 1 sin suscripción activa');

-- activar suscripción para permitir más skills y probar el unique
insert into subscriptions (user_id, status)
select id, 'active' from users where email = 'ana@test.eco';

-- 6. skills unique(business_id, name)
select throws_ok($$
  insert into skills (business_id, name)
  select id, 'café' from businesses where representative_email = 'cafe@test.eco'
$$, '23505', NULL, 'skills unique(business_id, name)');

-- producto de prueba
insert into products (business_id, name)
select id, 'Café con leche' from businesses where representative_email = 'cafe@test.eco';

-- 7. product_images: máximo 7 por producto
do $$
declare p uuid;
begin
  select id into p from products where name = 'Café con leche';
  for i in 1..7 loop
    insert into product_images (product_id, url, position) values (p, 'http://img/' || i, i);
  end loop;
end $$;
select throws_ok($$
  insert into product_images (product_id, url, position)
  select id, 'http://img/8', 8 from products where name = 'Café con leche'
$$, 'P0001', NULL, 'product_images: máx 7 por producto');

-- 8. videos: máximo 1 por producto
insert into videos (business_id, product_id, url)
select b.id, p.id, 'http://vid/1'
from businesses b, products p
where b.representative_email = 'cafe@test.eco' and p.name = 'Café con leche';
select throws_ok($$
  insert into videos (business_id, product_id, url)
  select b.id, p.id, 'http://vid/2'
  from businesses b, products p
  where b.representative_email = 'cafe@test.eco' and p.name = 'Café con leche'
$$, 'P0001', NULL, 'videos: máx 1 por producto');

-- 9. set_updated_at sobreescribe updated_at
update businesses set updated_at = '2000-01-01 00:00:00+00' where representative_email = 'cafe@test.eco';
select is(
  (select (updated_at > '2000-01-01 00:00:00+00') from businesses where representative_email = 'cafe@test.eco'),
  true,
  'set_updated_at sobreescribe updated_at'
);

-- 10. cascade delete borra productos del negocio
select lives_ok($$
  delete from businesses where representative_email = 'cafe@test.eco'
$$, 'delete cascades');
select is(
  (select count(*)::int from products where name = 'Café con leche'),
  0,
  'cascade borra productos del negocio'
);

select * from finish();
rollback;
