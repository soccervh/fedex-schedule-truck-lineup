# Send to Home Spot from Out of Service Modal

## Goal

Add a "Send to Home Spot" action to the OutOfServiceTruckModal so managers can quickly return a truck to its designated spot with one click, handling conflicts when another truck is already there.

## Behavior

1. **Truck has home spot, spot is empty:** Assign truck directly to home spot after "Is this truck ready?" confirmation.
2. **Truck has home spot, spot is occupied:** Show confirmation: "Spot X already has truck Y. Move Y to Available (Spare)?" If confirmed, displace old truck to available and assign OOS truck to home spot.
3. **Truck has no home spot:** Show "Add Home Spot" button that opens TruckModal for editing.

Displaced trucks always go to Available (spare).

## Changes

### OutOfServiceTruckModal

- Receive `homeSpot` data on the truck prop (expand TruckData interface to include homeSpot info)
- Receive `onEditTruck` callback prop to open TruckModal when "Add Home Spot" is clicked
- Add "Send to Home Spot (B12)" button at top of select step (before Move to Available)
- Or show "Add Home Spot" button if no home spot is set
- Add `confirm-home-spot` modal step for when home spot is occupied, showing displaced truck info
- Look up home spot occupancy from `allBelts` data (already available)

### TruckLineupPage

- Pass the full truck object (with homeSpot) to OutOfServiceTruckModal
- Pass an `onEditTruck` callback that opens TruckModal for the given truck
