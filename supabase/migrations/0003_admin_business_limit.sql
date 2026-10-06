-- 0003_admin_business_limit.sql
-- El Administrador gestiona negocios globalmente: no le aplica el límite de
-- "1 negocio sin suscripción activa". El límite sigue vigente para el resto
-- (usuario web/escritorio), según la suscripción del dueño del negocio.
-- Idempotente: reemplaza la función; el trigger de 0001 sigue apuntando a ella.

create or replace function ECO.enforce_businesses_limit() returns trigger as $$
declare active_sub boolean; owned integer;
begin
  -- El Administrador (claim JWT app_metadata.role = 'admin') queda exento.
  if ECO.is_admin() then
    return new;
  end if;

  -- Serializa inserts concurrentes del mismo dueño para evitar la carrera
  -- en la que dos inserts ven ambos cero negocios existentes.
  perform 1 from ECO.users where id = new.owner_id for update;
  select exists (select 1 from ECO.subscriptions where user_id = new.owner_id and status = 'active') into active_sub;
  if not active_sub then
    select count(*) into owned from ECO.businesses where owner_id = new.owner_id;
    if owned >= 1 then raise exception 'business limit exceeded without active subscription (max 1)'; end if;
  end if;
  return new;
end; $$ language plpgsql;
