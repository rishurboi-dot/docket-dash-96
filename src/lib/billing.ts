import type { Tables } from "@/integrations/supabase/types";

export type Company = Tables<"companies">;
export type Zone = Tables<"zones">;
export type RateCard = Tables<"rate_cards">;
export type Docket = Tables<"dockets">;
export type CourierReport = Tables<"courier_reports">;
export type CourierReportRow = Tables<"courier_report_rows">;
export type BillingRecord = Tables<"billing_records">;

export const MODES = ["Air", "Surface", "Express"] as const;
export type Mode = (typeof MODES)[number];

export function normalizeMode(value: string | null | undefined): string {
  if (!value) return "Surface";
  const v = value.trim().toLowerCase();
  if (v.startsWith("air") || v === "a") return "Air";
  if (v.startsWith("exp") || v === "e" || v.includes("priority")) return "Express";
  if (v.startsWith("sur") || v.startsWith("road") || v.startsWith("ground") || v === "s") return "Surface";
  return value.trim();
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface MatchInput {
  zoneId: string | null;
  mode: string | null;
  weight: number | null;
}

/** Find the best rate card for a company given zone, mode and weight. */
export function findRateCard(cards: RateCard[], input: MatchInput): RateCard | null {
  const mode = normalizeMode(input.mode);
  const weight = input.weight ?? 0;
  // When the report has no zone, ignore the zone filter and match on mode + weight.
  const sameZoneMode = cards.filter(
    (c) =>
      (input.zoneId == null || c.zone_id === input.zoneId) &&
      normalizeMode(c.mode) === mode,
  );
  const slab = sameZoneMode.find(
    (c) => weight >= Number(c.weight_from) && weight <= Number(c.weight_to),
  );
  if (slab) return slab;
  // fall back to widest slab for the zone+mode
  if (sameZoneMode.length) {
    return [...sameZoneMode].sort((a, b) => Number(b.weight_to) - Number(a.weight_to))[0];
  }
  return null;
}

/** Charge = base charge for the slab + per-kg charge * weight. */
export function calcCharge(card: RateCard, weight: number | null): number {
  return round2(Number(card.base_charge) + Number(card.per_kg_charge) * (weight ?? 0));
}

export interface BillingPreview {
  docket_number: string;
  company_id: string | null;
  company_name: string;
  zone_id: string | null;
  zone_name: string;
  mode: string;
  weight: number | null;
  charge: number;
  rate_card_id: string | null;
  report_id: string | null;
  matched: boolean;
  reason: string;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
}