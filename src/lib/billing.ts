import type { Tables } from "@/integrations/supabase/types";

export type Company = Tables<"companies">;
export type Zone = Tables<"zones">;
export type RateCard = Tables<"rate_cards">;
export type Docket = Tables<"dockets">;
export type CourierReport = Tables<"courier_reports">;
export type CourierReportRow = Tables<"courier_report_rows">;
export type BillingRecord = Tables<"billing_records">;
export type City = Tables<"cities">;
export type Quotation = Tables<"quotations">;
export type QuotationRate = Tables<"quotation_rates">;

export const MODES = ["Air", "Surface", "Priority"] as const;
export type Mode = (typeof MODES)[number];

export type RateUnit = "flat" | "per_kg" | "add_per_500g";
export const RATE_UNITS: { value: RateUnit; label: string }[] = [
  { value: "flat", label: "Flat (fixed for slab)" },
  { value: "per_kg", label: "Per kg" },
  { value: "add_per_500g", label: "Additional per 500g" },
];

export function normalizeMode(value: string | null | undefined): string {
  if (!value) return "Surface";
  const v = value.trim().toLowerCase();
  if (v.startsWith("air") || v === "a") return "Air";
  if (v.startsWith("pri") || v.startsWith("exp") || v === "p" || v === "e") return "Priority";
  if (v.startsWith("sur") || v.startsWith("road") || v.startsWith("ground") || v === "s") return "Surface";
  return value.trim();
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* --------------------- Automatic zone detection --------------------- */
export interface DetectedZone {
  zoneId: string | null;
  zoneName: string;
}

export function detectZone(
  city: string | null | undefined,
  cities: City[],
  zones: Zone[],
): DetectedZone {
  const roi = zones.find((z) => z.code === "ROI") ?? null;
  const fallback: DetectedZone = { zoneId: roi?.id ?? null, zoneName: roi?.name ?? "ROI" };
  const key = (city ?? "").trim().toLowerCase();
  if (!key) return fallback;
  const match = cities.find((c) => c.name.trim().toLowerCase() === key);
  if (!match) return fallback;
  const zone = zones.find((z) => z.id === match.zone_id);
  return { zoneId: zone?.id ?? roi?.id ?? null, zoneName: zone?.name ?? roi?.name ?? "ROI" };
}

/* ----------------------- Slab-based billing ------------------------- */
export interface SlabResult {
  available: boolean;
  amount: number;
  label: string;
}

const maxG = (r: QuotationRate) => r.max_weight_g ?? Number.MAX_SAFE_INTEGER;

/**
 * Calculate the charge for a single shipment from a set of quotation rate
 * slabs (already filtered to one company + mode + zone).
 * Supports flat slabs, per-kg slabs and "additional per 500g" increments.
 */
export function calcSlabCharge(
  rates: QuotationRate[],
  weightKg: number | null,
): SlabResult {
  const avail = rates.filter((r) => r.available);
  if (!avail.length) return { available: false, amount: 0, label: "NOT AVAILABLE" };

  const kg = Math.max(0, weightKg ?? 0);
  const w = Math.round(kg * 1000); // grams
  const sorted = [...avail].sort((a, b) => a.min_weight_g - b.min_weight_g);

  const inSlab = (r: QuotationRate) =>
    w <= maxG(r) && (w > r.min_weight_g || r.min_weight_g === 0);
  let slab = sorted.filter(inSlab).sort((a, b) => maxG(a) - maxG(b))[0];
  if (!slab) slab = sorted[sorted.length - 1]; // beyond all slabs -> heaviest

  const rate = Number(slab.rate);
  const unit = slab.rate_unit as RateUnit;

  if (unit === "per_kg") {
    return { available: true, amount: round2(rate * kg), label: `${rate}/kg` };
  }
  if (unit === "add_per_500g") {
    const baseSlab = sorted
      .filter((r) => r.rate_unit === "flat" && maxG(r) <= slab.min_weight_g)
      .sort((a, b) => maxG(b) - maxG(a))[0];
    const base = baseSlab ? Number(baseSlab.rate) : 0;
    const blocks = Math.max(1, Math.ceil((w - slab.min_weight_g) / 500));
    return {
      available: true,
      amount: round2(base + blocks * rate),
      label: `base + ${blocks}×500g`,
    };
  }
  return { available: true, amount: round2(rate), label: "flat" };
}

export function slabLabel(r: QuotationRate): string {
  const from = r.min_weight_g >= 1000 ? `${r.min_weight_g / 1000}kg` : `${r.min_weight_g}g`;
  const to =
    r.max_weight_g == null
      ? "∞"
      : r.max_weight_g >= 1000
        ? `${r.max_weight_g / 1000}kg`
        : `${r.max_weight_g}g`;
  return `${from} – ${to}`;
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