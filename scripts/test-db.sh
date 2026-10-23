#!/usr/bin/env bash
# Runs the Supabase migration + seed + behaviour tests against a local PostgreSQL.
# Usage: PGHOST=… PGPORT=… PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=zooot_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
for f in supabase/tests/stub.sql supabase/migrations/*.sql supabase/seed.sql supabase/tests/schema.test.sql supabase/tests/couriers.test.sql supabase/tests/live.test.sql; do
  echo "→ $f"
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"
done
