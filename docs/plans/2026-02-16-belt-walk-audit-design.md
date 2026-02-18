# Belt Walk Audit Design

## Goal

Add a "Walk Belt" feature that lets managers physically walk a belt, verify which trucks are actually in each spot, and get a summary of mismatches with keys needed. Optionally fix system assignments to match reality.

## Flow

1. **Start:** "Walk Belt" button on the Truck Lineup page. User picks which belt (A/B/C/D).
2. **Checklist:** Scrollable list of all spots on the selected belt, ordered top to bottom. Each row shows:
   - Spot name (e.g. A1)
   - Expected truck number (from system's truck assignment for the current date)
   - Checkmark button = correct, X button = wrong
   - If X tapped: text input appears to type the actual truck number
   - Empty spots (no truck assigned in system) shown but grayed out / skippable
3. **Submit:** Button at bottom, enabled once all assigned spots are checked.
4. **Keys Summary:** Shows only mismatches:
   - "Spot A3: Expected T205, Found T108 — Need keys for T205 and T108"
   - "Fix in System" button per mismatch (reassigns actual truck to that spot)
   - "Fix All" button to update all mismatches at once

## UI

- Full-screen modal or page overlay
- Belt selector at top (tabs or dropdown)
- Checklist is the main content area
- Summary appears after submit, replacing the checklist
- "Back to Checklist" to review/edit before fixing

## Data

- Reads from existing belt assignments + truck spot assignments for the selected date
- "Fix" uses the existing POST /trucks/spot-assignments endpoint (which already handles displacing existing trucks)
- No new API endpoints or database changes needed
