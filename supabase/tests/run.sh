#!/usr/bin/env bash
# Builds a scratch database from the stubs + every migration, then runs
# each supabase/tests/*.test.sql in it. A test fails by raising.
#
#   PGHOST=/tmp/pgtest PGPORT=5433 PGUSER=postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=fc_test
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB" \
  -c "alter database $DB set search_path = \"\$user\", public, extensions"
export PGDATABASE=$DB
psql -v ON_ERROR_STOP=1 -q -f tests/00_stubs.sql
for f in migrations/*.sql; do
  echo "• $f"
  psql -v ON_ERROR_STOP=1 -q -f "$f" 2>&1 | grep -v "^NOTICE" || true
  test "${PIPESTATUS[0]}" -eq 0
done
psql -v ON_ERROR_STOP=1 -q -f tests/helpers.sql
for t in tests/*.test.sql; do
  [ -e "$t" ] || continue
  echo "▶ $t"
  psql -v ON_ERROR_STOP=1 -q -o /dev/null -f "$t"
done
echo "all SQL tests passed"
