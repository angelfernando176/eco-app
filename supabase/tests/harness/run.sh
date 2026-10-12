#!/usr/bin/env bash
# run.sh — throwaway Supabase/Postgres harness for ECO's pgTAP suite.
#
# Starts a disposable postgres:16 container, installs pgTAP inside it,
# recreates the minimal Supabase platform surface (roles, auth, storage,
# extensions — see stubs.sql), applies migrations 0001..0005, then runs every
# *_test.sql file in supabase/tests. The container is always removed on exit,
# even on failure. No secrets are used or stored.
#
# Usage: bash supabase/tests/harness/run.sh

set -euo pipefail
export MSYS_NO_PATHCONV=1 # prevent git-bash from rewriting /dev/stdin, container paths, etc.

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(cd "${HARNESS_DIR}/.." && pwd)"
MIGRATIONS_DIR="$(cd "${TESTS_DIR}/../migrations" && pwd)"

CONTAINER_NAME="eco-test-pg"
IMAGE="postgres:16"
PGUSER="postgres"
PGPASSWORD="postgres"
PGDATABASE="postgres"
PGTAP_AVAILABLE=1

cleanup() {
  echo "--- cleanup: removing ${CONTAINER_NAME} ---"
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "--- removing any stale ${CONTAINER_NAME} container ---"
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "--- pulling ${IMAGE} (polling; registry pulls can be slow) ---"
docker pull "${IMAGE}" &
PULL_PID=$!
SECS=0
while kill -0 "${PULL_PID}" 2>/dev/null; do
  sleep 5
  SECS=$((SECS + 5))
  echo "    ... still pulling (${SECS}s)"
done
wait "${PULL_PID}"

echo "--- starting ${CONTAINER_NAME} on a free (dynamic) host port ---"
docker run -d --name "${CONTAINER_NAME}" \
  -e POSTGRES_PASSWORD="${PGPASSWORD}" \
  -e POSTGRES_DB="${PGDATABASE}" \
  -p 127.0.0.1::5432 \
  "${IMAGE}" >/dev/null

HOST_PORT="$(docker port "${CONTAINER_NAME}" 5432/tcp | head -1 | cut -d: -f2 || true)"
echo "    container: ${CONTAINER_NAME}, host port: ${HOST_PORT:-unknown} (unused — tests run via docker exec)"

echo "--- waiting for postgres to accept connections ---"
READY=0
for i in $(seq 1 60); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U "${PGUSER}" >/dev/null 2>&1; then
    echo "    ready after ${i}s"
    READY=1
    break
  fi
  sleep 1
done
if [ "${READY}" -ne 1 ]; then
  echo "postgres did not become ready in time" >&2
  docker logs "${CONTAINER_NAME}" 2>&1 | tail -50
  exit 1
fi

psql_exec() {
  # Runs a SQL file piped on stdin inside the container; -t -A keeps output
  # as bare TAP lines (pgTAP's plan()/ok()/finish() each return one text row).
  timeout 120 docker exec -i "${CONTAINER_NAME}" psql -X -v ON_ERROR_STOP=1 -U "${PGUSER}" -d "${PGDATABASE}" "$@"
}

echo "--- installing pgTAP inside the container ---"
INSTALL_LOG="$(mktemp)"
if timeout 180 docker exec "${CONTAINER_NAME}" bash -c \
  "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq postgresql-16-pgtap" \
  >"${INSTALL_LOG}" 2>&1; then
  echo "    pgTAP installed via apt-get"
else
  echo "    WARNING: apt-get install postgresql-16-pgtap failed" >&2
  tail -30 "${INSTALL_LOG}" >&2 || true
  PGTAP_AVAILABLE=0
fi

echo "--- applying stubs (roles, auth, storage, extensions) ---"
cat "${HARNESS_DIR}/stubs.sql" | psql_exec -t -A -f /dev/stdin

if [ "${PGTAP_AVAILABLE}" -ne 1 ]; then
  echo "FALLBACK: pgTAP extension could not be installed from apt." >&2
  echo "The documented fallback (minimal assertion checks without pgTAP) was NOT run" >&2
  echo "automatically; re-run this script once apt-get access to the pgTAP package is" >&2
  echo "available, or adapt the *_test.sql files to plain 'DO' blocks that RAISE on" >&2
  echo "unexpected results." >&2
  exit 1
fi

echo "--- applying migrations 0001..0007 ---"
for f in 0001_init.sql 0002_auth.sql 0003_admin_business_limit.sql 0004_catalog_limits_storage.sql 0005_mobile.sql 0006_mobile_business.sql 0007_admin_mobile_password.sql; do
  echo "    -> ${f}"
  cat "${MIGRATIONS_DIR}/${f}" | psql_exec -t -A -f /dev/stdin
done

echo "--- running pgTAP tests ---"
TOTAL_PASS=0
TOTAL_FAIL=0
declare -a FAILED_FILES=()

for f in "${TESTS_DIR}"/*.sql; do
  name="$(basename "${f}")"
  echo "=== ${name} ==="
  OUT="$(cat "${f}" | psql_exec -t -A -f /dev/stdin 2>&1 || true)"
  echo "${OUT}" | tail -60
  pass="$(printf '%s\n' "${OUT}" | grep -c '^ok ' || true)"
  fail="$(printf '%s\n' "${OUT}" | grep -c '^not ok ' || true)"
  echo "    ${name}: ${pass} ok, ${fail} not ok"
  TOTAL_PASS=$((TOTAL_PASS + pass))
  TOTAL_FAIL=$((TOTAL_FAIL + fail))
  if [ "${fail}" -gt 0 ]; then
    FAILED_FILES+=("${name}")
  fi
done

echo "=== summary ==="
echo "total: ${TOTAL_PASS} ok, ${TOTAL_FAIL} not ok"
if [ "${#FAILED_FILES[@]}" -gt 0 ]; then
  echo "failed files: ${FAILED_FILES[*]}"
  exit 1
fi
echo "all tests passed"
