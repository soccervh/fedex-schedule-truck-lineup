#!/bin/sh

echo "Checking migration state..."

# First, fix any incorrectly baselined migrations.
# The 20260306* migrations were incorrectly marked as applied in a previous deploy
# but never actually ran. Remove them so they can run properly (they are idempotent).
STATUS_OUTPUT=$(npx prisma migrate status 2>&1) || true
echo "$STATUS_OUTPUT"

# If the migrations table already exists but the 20260306 migrations were baselined
# without actually running, we need to un-baseline them.
# We do this by directly removing them from _prisma_migrations if the table exists.
# This is safe because the migration SQL is now idempotent.
npx prisma db execute --stdin <<'SQL' 2>/dev/null || true
DELETE FROM "_prisma_migrations"
WHERE "migration_name" IN (
  '20260306000000_extend_homearea_enum',
  '20260306100000_remove_assigned_area',
  '20260306110000_add_facility_and_route_fields'
);
SQL

echo "Running prisma migrate deploy..."
DEPLOY_OUTPUT=$(npx prisma migrate deploy 2>&1) && {
  echo "$DEPLOY_OUTPUT"
  echo "Migrations complete."
  exit 0
}

echo "$DEPLOY_OUTPUT"

# Check if it failed because the DB already has schema but no migration history (P3005)
if echo "$DEPLOY_OUTPUT" | grep -q "P3005"; then
  echo ""
  echo "Database has existing schema without migration history. Baselining pre-existing migrations..."
  npx prisma migrate resolve --applied 20260121004403_init
  npx prisma migrate resolve --applied 20260209231355_add_belt_letter_base
  npx prisma migrate resolve --applied 20260213180807_add_route_and_daily_briefing
  npx prisma migrate resolve --applied 20260214031650_add_truck_type
  npx prisma migrate resolve --applied 20260216180000_add_timeoff_balances_and_work_schedule
  npx prisma migrate resolve --applied 20260216190000_add_access_levels_and_invites
  npx prisma migrate resolve --applied 20260216_split_sprinter_van
  echo "Pre-existing migrations baselined. Running migrate deploy for remaining migrations..."
  npx prisma migrate deploy
  echo "Migrations complete."
else
  echo "Migration failed with unexpected error."
  exit 1
fi
