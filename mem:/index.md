# Project Memory

## Core
Courier billing app (SwiftBill). No user login (chosen by user) — tables use permissive public RLS intentionally.
Design: logistics dashboard, deep navy primary + amber accent. Space Grotesk headings, Plus Jakarta Sans body. Keep current UI.
Modes: Air, Surface, Priority. Zones: NCR, Regional, Metro, Special, ROI (ROI = default fallback).
Zone auto-detected from receiver city via `cities` table (city->zone). Unknown city -> ROI.
Billing: select company + optional date range -> bill matched dockets. Charge from slab quotation (per company+mode+zone). Slab units: flat, per_kg, add_per_500g. NOT AVAILABLE when no available slab/quotation.
Excel via SheetJS (xlsx), PDF via jspdf + jspdf-autotable, charts via Recharts.

## Memories
- [Courier report format](mem://features/courier-report-format) — Excel column mapping: documentNo/travelBy/totalWeight/receiverCity, no zone column, zone auto-detected from city
- [Billing data model](mem://features/billing-model) — cities/quotations/quotation_rates tables, slab engine, zone detection
