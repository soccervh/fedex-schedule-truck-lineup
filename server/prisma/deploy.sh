#!/bin/sh
set -e

# Check if _prisma_migrations table exists with any applied migrations
# If prisma migrate status shows "Database schema is up to date" or lists applied migrations,
# then migrations are already tracked. If it shows no applied migrations or errors about
# missing table, we need to baseline.
NEEDS_BASELINE=false

# Try to get migration status; if no migrations are recorded, we need to baseline
STATUS_OUTPUT=$(npx prisma migrate status 2>&1) || true

if echo "$STATUS_OUTPUT" | grep -q "Following migration have not yet been applied"; then
  # _prisma_migrations table exists but some migrations aren't applied
  # Check if the FIRST migration (init) has been applied
  if echo "$STATUS_OUTPUT" | grep -q "20260121004403_init"; then
    NEEDS_BASELINE=true
  fi
elif echo "$STATUS_OUTPUT" | grep -q "The current database is not managed by Prisma Migrate"; then
  # No _prisma_migrations table at all — need to baseline everything
  NEEDS_BASELINE=true
fi

if [ "$NEEDS_BASELINE" = true ]; then
  echo "Baselining: marking all existing migrations as applied..."
  npx prisma migrate resolve --applied 20260121004403_init || true
  npx prisma migrate resolve --applied 20260209231355_add_belt_letter_base || true
  npx prisma migrate resolve --applied 20260213180807_add_route_and_daily_briefing || true
  npx prisma migrate resolve --applied 20260214031650_add_truck_type || true
  npx prisma migrate resolve --applied 20260216180000_add_timeoff_balances_and_work_schedule || true
  npx prisma migrate resolve --applied 20260216190000_add_access_levels_and_invites || true
  npx prisma migrate resolve --applied 20260216_split_sprinter_van || true
  npx prisma migrate resolve --applied 20260306000000_extend_homearea_enum || true
  npx prisma migrate resolve --applied 20260306100000_remove_assigned_area || true
  npx prisma migrate resolve --applied 20260306110000_add_facility_and_route_fields || true
  echo "All existing migrations marked as applied."
fi

# Now run any pending migrations
echo "Running prisma migrate deploy..."
npx prisma migrate deploy
echo "Migrations complete."
