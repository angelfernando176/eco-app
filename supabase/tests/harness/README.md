# ECO pgTAP harness (Docker)

Reusable, throwaway harness to run the `supabase/tests/*.sql` pgTAP suite
against a real PostgreSQL instance, without needing the Supabase CLI or a
cloud project. Never connects to the real Supabase cloud project.

## What it does

1. Starts a disposable `postgres:16` container (`eco-test-pg`) on a free,
   dynamically-assigned host port. The container is always removed on exit
   (success or failure) via a `trap`.
2. Installs the `pgtap` extension inside the container
   (`postgresql-16-pgtap` via `apt-get`). If that install fails (e.g. no
   network access to the Debian mirror from inside the container), the
   script stops and reports the fallback explicitly instead of silently
   skipping tests — see "pgTAP install fallback" below.
3. Applies `stubs.sql`, which recreates the minimal slice of the Supabase
   platform that ECO's migrations/tests rely on and that a plain
   `postgres:16` image does not provide:
   - roles `anon`, `authenticated`, `service_role` (the same roles the
     tests `set local role ...` to).
   - schema `auth` with table `auth.users` and functions `auth.uid()` /
     `auth.jwt()` that read the `request.jwt.claims` GUC exactly like
     Supabase does (same mechanism the existing tests already use via
     `set local "request.jwt.claims" to '...'`).
   - schema `extensions` with `pgcrypto` (for `gen_random_uuid()`) and
     `pgtap`, and the database `search_path` adjusted so unqualified
     `gen_random_uuid()` calls in the migrations resolve, matching
     Supabase's actual default search_path.
   - schema `storage` with `storage.buckets`, `storage.objects` (RLS
     enabled) and `storage.foldername()`, used by `0004`'s media policies.
4. Applies migrations `0001_init.sql` .. `0005_mobile.sql` in order.
5. Runs every `*_test.sql` file under `supabase/tests/` (not the
   `harness/` subfolder) and reports pass/fail counts per file.

No secrets are used or stored; the container's password is a throwaway
local-only value (`postgres`) scoped to the ephemeral container.

## Usage

```bash
bash supabase/tests/harness/run.sh
```

Requires Docker Desktop running. The script polls (rather than blocking
silently) while pulling the image, and bounds long-running steps with
`timeout`. All commands run in the foreground.

## pgTAP install fallback

The script installs `pgtap` via `apt-get install postgresql-16-pgtap`
inside the container. If that fails (for example, no outbound network
access from the container to the Debian package mirror), the script exits
with a clear message instead of silently skipping tests. The documented
fallback in that case is to rewrite the assertions in the `*_test.sql`
files as plain `DO $$ ... RAISE EXCEPTION ... END $$;` blocks that check
the same conditions pgTAP's `ok()`/`throws_ok()`/`lives_ok()` check, since
plain PL/pgSQL `RAISE` requires no extension. This fallback was not needed
in practice when the harness was last run (see the task report for the
observed pgTAP install result).

## Idempotency

The script removes any stale `eco-test-pg` container before starting and
on exit, so re-running it is safe. `stubs.sql` uses `create ... if not
exists` / `create or replace` throughout.
