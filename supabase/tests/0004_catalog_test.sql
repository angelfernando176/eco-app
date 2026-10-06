-- 0004_catalog_test.sql — tests pgTAP para los límites de plan, el guard de
-- producto principal/secundario y los helpers de Storage de 0004_catalog_limits_storage.sql.
-- Requiere la extensión pgtap. Ejecutar con: supabase test db
--
-- IMPORTANTE: apunta al esquema "ECO". El esquema "public" pertenece a otro
-- proyecto y no se lee ni se modifica.

begin;
select plan(27);

set search_path to ECO, extensions;

-- ---------------------------------------------------------------------------
-- Dueño sin suscripción: plan gratuito (1 negocio / 1 producto / 1 skill;
-- hasta 7 imágenes por producto; sin videos por RLS).
-- ---------------------------------------------------------------------------
-- auth.users dispara handle_new_user(): crea el perfil automáticamente (type=1);
-- completamos los campos que el trigger deja vacíos en vez de insertar un
-- segundo perfil con el mismo auth_user_id.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000f001', 'free-owner@test.eco');
update users set first_name = 'Free', last_name = 'Owner', age_range = '25-34'
where auth_user_id = '00000000-0000-0000-0000-00000000f001';

insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
  latitude, longitude, main_street, secondary_street, number, reference)
select id, 'Negocio Gratis', '100', '099', 'free-owner@test.eco', 0, 0, 'A', 'B', '1', 'R'
from users where email = 'free-owner@test.eco';

-- 1. businesses: máx 1 sin suscripción
select throws_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  select id, 'Negocio Gratis 2', '101', '099', 'free-owner-2@test.eco', 0, 0, 'A', 'B', '1', 'R'
  from users where email = 'free-owner@test.eco'
$$, 'P0001', NULL, 'businesses: máx 1 sin suscripción activa');

insert into products (business_id, name)
select id, 'Producto Gratis' from businesses where representative_email = 'free-owner@test.eco';

-- 2. products: máx 1 sin suscripción
select throws_ok($$
  insert into products (business_id, name)
  select id, 'Producto Gratis 2' from businesses where representative_email = 'free-owner@test.eco'
$$, 'P0001', NULL, 'products: máx 1 sin suscripción activa');

insert into skills (business_id, name)
select id, 'skill-gratis' from businesses where representative_email = 'free-owner@test.eco';

-- 3. skills: máx 1 sin suscripción
select throws_ok($$
  insert into skills (business_id, name)
  select id, 'skill-gratis-2' from businesses where representative_email = 'free-owner@test.eco'
$$, 'P0001', NULL, 'skills: máx 1 sin suscripción activa');

-- 4. product_images: tope flat de 7, sin importar el plan
do $$
declare p uuid;
begin
  select id into p from products where name = 'Producto Gratis';
  for i in 1..7 loop
    insert into product_images (product_id, url, position) values (p, 'http://img/f' || i, i);
  end loop;
end $$;
select throws_ok($$
  insert into product_images (product_id, url, position)
  select id, 'http://img/f8', 8 from products where name = 'Producto Gratis'
$$, 'P0001', NULL, 'product_images: máx 7 por producto (plan gratuito)');

-- 5. videos: sin suscripción, el dueño no puede escribir (RLS can_manage_catalog)
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f001"}';
select throws_ok($$
  insert into videos (business_id, product_id, url)
  select b.id, p.id, 'http://vid/free'
  from businesses b, products p
  where b.representative_email = 'free-owner@test.eco' and p.name = 'Producto Gratis'
$$, '42501', NULL, 'videos: dueño sin suscripción no puede escribir (RLS)');
reset role;

-- ---------------------------------------------------------------------------
-- Dueño con suscripción activa: plan pagado (hasta 7 negocios / 7 productos /
-- 2 videos por negocio).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000f002', 'sub-owner@test.eco');
update users set first_name = 'Sub', last_name = 'Owner', age_range = '35-44'
where auth_user_id = '00000000-0000-0000-0000-00000000f002';

insert into subscriptions (user_id, status)
select id, 'active' from users where email = 'sub-owner@test.eco';

insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
  latitude, longitude, main_street, secondary_street, number, reference)
select id, 'Negocio Sub 1', '200', '099', 'sub-owner@test.eco', 0, 0, 'A', 'B', '1', 'R'
from users where email = 'sub-owner@test.eco';

-- 6. businesses: hasta 7 con suscripción activa
do $$
declare o uuid;
begin
  select id into o from users where email = 'sub-owner@test.eco';
  for i in 2..7 loop
    insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
      latitude, longitude, main_street, secondary_street, number, reference)
    values (o, 'Negocio Sub ' || i, '20' || i, '099', 'sub-owner-' || i || '@test.eco', 0, 0, 'A', 'B', '1', 'R');
  end loop;
end $$;
select is(
  (select count(*)::int from businesses b join users u on u.id = b.owner_id where u.email = 'sub-owner@test.eco'),
  7,
  'businesses: el dueño con suscripción llega a 7 negocios'
);

-- 7. businesses: el 8vo falla con suscripción activa
select throws_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  select id, 'Negocio Sub 8', '208', '099', 'sub-owner-8@test.eco', 0, 0, 'A', 'B', '1', 'R'
  from users where email = 'sub-owner@test.eco'
$$, 'P0001', NULL, 'businesses: máx 7 con suscripción activa');

-- 8. products: hasta 7 con suscripción activa (por negocio)
do $$
declare b uuid;
begin
  select id into b from businesses where representative_email = 'sub-owner@test.eco';
  for i in 1..7 loop
    insert into products (business_id, name) values (b, 'Producto Sub ' || i);
  end loop;
end $$;
select is(
  (select count(*)::int from products p join businesses b on b.id = p.business_id
   where b.representative_email = 'sub-owner@test.eco'),
  7,
  'products: el negocio con suscripción llega a 7 productos'
);

-- 9. products: el 8vo falla con suscripción activa
select throws_ok($$
  insert into products (business_id, name)
  select id, 'Producto Sub 8' from businesses where representative_email = 'sub-owner@test.eco'
$$, 'P0001', NULL, 'products: máx 7 por negocio con suscripción activa');

-- 10. videos: hasta 2 por negocio
insert into videos (business_id, product_id, url)
select b.id, p.id, 'http://vid/sub1'
from businesses b, products p
where b.representative_email = 'sub-owner@test.eco' and p.name = 'Producto Sub 1';
insert into videos (business_id, product_id, url)
select b.id, p.id, 'http://vid/sub2'
from businesses b, products p
where b.representative_email = 'sub-owner@test.eco' and p.name = 'Producto Sub 2';
select is(
  (select count(*)::int from videos v join businesses b on b.id = v.business_id
   where b.representative_email = 'sub-owner@test.eco'),
  2,
  'videos: el negocio con suscripción llega a 2 videos'
);

-- 11. videos: el 3ro falla (máx 2 por negocio)
select throws_ok($$
  insert into videos (business_id, product_id, url)
  select b.id, p.id, 'http://vid/sub3'
  from businesses b, products p
  where b.representative_email = 'sub-owner@test.eco' and p.name = 'Producto Sub 3'
$$, 'P0001', NULL, 'videos: máx 2 por negocio con suscripción activa');

-- ---------------------------------------------------------------------------
-- guard_product_flags: solo el administrador marca principal/secundario
-- ---------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f002"}';

-- 12. el dueño (no admin) no puede insertar marcando is_primary (producto nuevo,
--     distinto de los 7 ya creados, para no confundir este chequeo con el tope
--     de productos del trigger enforce_products_limit).
delete from products where name = 'Producto Sub 7';
select throws_ok($$
  insert into products (business_id, name, is_primary)
  select id, 'Producto Primario Dueño', true from businesses where representative_email = 'sub-owner@test.eco'
$$, 'P0001', NULL, 'guard_product_flags: el dueño no inserta con is_primary=true');

-- 13. el dueño (no admin) no puede actualizar is_primary
select throws_ok($$
  update products set is_primary = true
  where name = 'Producto Sub 1'
$$, 'P0001', NULL, 'guard_product_flags: el dueño no actualiza is_primary');

reset role;

-- 14. el administrador sí puede marcar principal/secundario
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f003","app_metadata":{"role":"admin"}}';

select lives_ok($$
  update products set is_primary = true
  where name = 'Producto Sub 1'
$$, 'guard_product_flags: el administrador marca is_primary');

-- ---------------------------------------------------------------------------
-- admin unlimited: sin tope de negocios/productos/videos/imágenes
-- ---------------------------------------------------------------------------
-- 15. admin inserta el 8vo negocio del dueño sin suscripción (bypassa el límite)
select lives_ok($$
  insert into businesses (owner_id, trade_name, ruc, phone, representative_email,
    latitude, longitude, main_street, secondary_street, number, reference)
  select id, 'Negocio Admin 8', '300', '099', 'admin-8@test.eco', 0, 0, 'A', 'B', '1', 'R'
  from users where email = 'free-owner@test.eco'
$$, 'admin: inserta un negocio aun con el dueño en el límite (1/1)');

-- 16. admin inserta el 8vo video del negocio con suscripción (bypassa el límite de 2)
select lives_ok($$
  insert into videos (business_id, product_id, url)
  select b.id, p.id, 'http://vid/admin'
  from businesses b, products p
  where b.representative_email = 'sub-owner@test.eco' and p.name = 'Producto Sub 3'
$$, 'admin: inserta un video aun con el negocio en el límite (2/2)');

reset role;

-- ---------------------------------------------------------------------------
-- Storage helpers: ECO.storage_business_id / ECO.can_write_media
-- ---------------------------------------------------------------------------
-- 17. storage_business_id extrae el uuid de la ruta <tipo>/<business_id>/<archivo>
select is(
  (select ECO.storage_business_id(
    'logos/' || (select id::text from businesses where representative_email = 'sub-owner@test.eco') || '/logo.png'
  )),
  (select id from businesses where representative_email = 'sub-owner@test.eco'),
  'storage_business_id extrae el business_id de la ruta'
);

-- 18. storage_business_id devuelve null si el segmento no es un uuid
select is(
  ECO.storage_business_id('logos/no-es-un-uuid/logo.png'),
  null::uuid,
  'storage_business_id devuelve null con un segmento inválido'
);

-- 19. can_write_media: false para carpeta no reconocida
select is(
  ECO.can_write_media(
    'otra-carpeta/' || (select id::text from businesses where representative_email = 'sub-owner@test.eco') || '/x.png'
  ),
  false,
  'can_write_media: false en una carpeta no reconocida'
);

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f001"}';

-- 20. can_write_media: false para el dueño sin suscripción (plan gratuito)
select is(
  ECO.can_write_media(
    'logos/' || (select id::text from businesses where representative_email = 'free-owner@test.eco') || '/logo.png'
  ),
  false,
  'can_write_media: false para el dueño sin suscripción'
);

reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f002"}';

-- 21. can_write_media: true para el dueño con suscripción activa en su negocio
select is(
  ECO.can_write_media(
    'products/' || (select id::text from businesses where representative_email = 'sub-owner@test.eco') || '/x.png'
  ),
  true,
  'can_write_media: true para el dueño con suscripción en su propio negocio'
);

-- 22. can_write_media: false para el dueño con suscripción en el negocio de otro
select is(
  ECO.can_write_media(
    'products/' || (select id::text from businesses where representative_email = 'free-owner@test.eco') || '/x.png'
  ),
  false,
  'can_write_media: false para el dueño en el negocio de otro'
);

reset role;

set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f003","app_metadata":{"role":"admin"}}';

-- 23. can_write_media: true para el administrador en cualquier negocio
select is(
  ECO.can_write_media(
    'videos/' || (select id::text from businesses where representative_email = 'free-owner@test.eco') || '/x.mp4'
  ),
  true,
  'can_write_media: true para el administrador en cualquier negocio'
);

reset role;

-- ---------------------------------------------------------------------------
-- Storage: políticas RLS sobre storage.objects
-- ---------------------------------------------------------------------------
-- 24. lectura pública del bucket eco-media
set local role anon;
select lives_ok($$
  select 1 from storage.objects where bucket_id = 'eco-media'
$$, 'anon lee storage.objects del bucket eco-media');
reset role;

-- 25. anon no puede insertar objetos (la política exige authenticated)
set local role anon;
select throws_ok($$
  insert into storage.objects (bucket_id, name)
  values ('eco-media', 'logos/' || gen_random_uuid()::text || '/x.png')
$$, '42501', NULL, 'anon no inserta objetos en storage');
reset role;

-- 26. autenticado sin permiso de catálogo no puede insertar en el negocio ajeno
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f001"}';
select throws_ok($$
  insert into storage.objects (bucket_id, name)
  select 'eco-media', 'logos/' || id::text || '/x.png'
  from businesses where representative_email = 'sub-owner@test.eco'
$$, '42501', NULL, 'autenticado sin gestión del catálogo no inserta objetos en negocio ajeno');
reset role;

-- 27. el dueño con suscripción inserta objetos de su propio negocio
set local role authenticated;
set local "request.jwt.claims" to '{"sub":"00000000-0000-0000-0000-00000000f002"}';
select lives_ok($$
  insert into storage.objects (bucket_id, name)
  select 'eco-media', 'logos/' || id::text || '/x.png'
  from businesses where representative_email = 'sub-owner@test.eco'
$$, 'el dueño con suscripción inserta objetos de su propio negocio');
reset role;

select * from finish();
rollback;
