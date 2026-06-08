## Goal
Fix the Dashboard KPI cards so large values (₹20,135.00, 419.00 kg, etc.) are fully visible — no more "..." truncation — while keeping colors, charts, navigation, and all business logic untouched.

## Root cause
- In `StatCard.tsx`, the value uses `truncate text-2xl`, which clips long numbers with an ellipsis and forces a fixed large font.
- In the Dashboard (`index.tsx`), the KPI grid jumps to `xl:grid-cols-6`, making each of the 6 cards too narrow for big currency/weight values.

## Changes

### 1. `src/components/StatCard.tsx` (presentation only)
- Remove `truncate` from the value so text is never cut off.
- Make the value font responsive and auto-shrink for long values: smaller base size with a clamp-style approach (e.g. `text-xl sm:text-2xl`) plus `break-words`/`leading-tight` so very long values wrap instead of overflowing.
- Increase card padding/min-height slightly (e.g. taller min-height, a touch more padding) so cards feel bigger and values breathe.
- Keep the icon, label, layout, and existing color tokens exactly as-is.

### 2. `src/routes/_authenticated/index.tsx` (KPI grid only)
- Adjust the KPI grid so all 6 cards still align in one row on large desktop but each card is wider/more comfortable, and wrap cleanly on smaller screens:
  - mobile: 1 column
  - small: 2 columns
  - medium: 3 columns
  - large desktop: 6 columns in a single row (with slightly larger gap for spacing)
- No change to data, calculations, formatting, charts, or workflow section.

## Out of scope (unchanged)
- Colors, design tokens, charts, navigation, business logic, data fetching, and all values/formatting.

## Verification
- Check the preview at desktop, tablet, and mobile widths to confirm: 6 cards in one row on desktop, wrapping on smaller screens, and full values (₹20,135.00 / 419.00 kg) with no ellipsis.
