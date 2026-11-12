-- 0013_password_resets.sql — Códigos de restablecimiento de contraseña para
-- el portal de clientes de ExxaSoft (login web, producto "eco"). Vive en el
-- esquema ECO, igual que el resto de este proyecto (0001-0012): "public"
-- pertenece a otro proyecto y no se lee ni se modifica.
--
-- Solo el service_role (usado desde exxasoft/server, nunca desde el
-- navegador) puede leer o escribir esta tabla: RLS queda activo y sin
-- políticas, por lo que anon/authenticated quedan bloqueados por completo
-- (service_role bypassea RLS). Los grants amplios de 0001
-- (alter default privileges in schema ECO ...) ya cubren esta tabla, no
-- hacen falta grants explícitos aquí.

create table if not exists ECO.password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_resets_email_pending_idx
  on ECO.password_resets (email)
  where used_at is null;

alter table ECO.password_resets enable row level security;
