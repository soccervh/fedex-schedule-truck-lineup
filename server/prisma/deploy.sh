#!/bin/sh

echo "Attempting prisma migrate deploy..."
DEPLOY_OUTPUT=$(npx prisma migrate deploy 2>&1) && {
  echo "$DEPLOY_OUTPUT"
  echo "Migrations complete."
  exit 0
}

# If we get here, migrate deploy failed
echo "$DEPLOY_OUTPUT"

# Check if it failed because the DB already has schema but no migration history (P3005)
if echo "$DEPLOY_OUTPUT" | grep -q "P3005"; then
  echo ""
  echo "Database has existing schema without migration history. Baselining..."
  npx prisma migrate resolve --applied 20260121004403_init
  npx prisma migrate resolve --applied 20260209231355_add_belt_letter_base
  npx prisma migrate resolve --applied 20260213180807_add_route_and_daily_briefing
  npx prisma migrate resolve --applied 20260214031650_add_truck_type
  npx prisma migrate resolve --applied 20260216180000_add_timeoff_balances_and_work_schedule
  npx prisma migrate resolve --applied 20260216190000_add_access_levels_and_invites
  npx prisma migrate resolve --applied 20260216_split_sprinter_van
  npx prisma migrate resolve --applied 20260306000000_extend_homearea_enum
  npx prisma migrate resolve --applied 20260306100000_remove_assigned_area
  npx prisma migrate resolve --applied 20260306110000_add_facility_and_route_fields
  echo "All migrations baselined. Running migrate deploy again..."
  npx prisma migrate deploy
  echo "Migrations complete."
else
  echo "Migration failed with unexpected error."
  exit 1
fi
