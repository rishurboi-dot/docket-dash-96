import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import type {
  BillingRecord,
  Company,
  CourierReport,
  CourierReportRow,
  Docket,
  RateCard,
  Zone,
} from "./billing";
import type { City, Quotation, QuotationRate } from "./billing";

/* ----------------------------- Companies ----------------------------- */
export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase.from("companies").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"companies"> & { id?: string }) => {
      const { error } = await supabase.from("companies").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

/* ------------------------------- Zones ------------------------------- */
export function useZones() {
  return useQuery({
    queryKey: ["zones"],
    queryFn: async (): Promise<Zone[]> => {
      const { data, error } = await supabase.from("zones").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"zones"> & { id?: string }) => {
      const { error } = await supabase.from("zones").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("zones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  });
}

/* ------------------------------- Cities ------------------------------ */
export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: async (): Promise<City[]> => {
      const { data, error } = await supabase.from("cities").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"cities"> & { id?: string }) => {
      const { error } = await supabase.from("cities").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cities"] }),
  });
}

export function useDeleteCity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cities"] }),
  });
}

/* ---------------------------- Quotations ----------------------------- */
export function useQuotations() {
  return useQuery({
    queryKey: ["quotations"],
    queryFn: async (): Promise<Quotation[]> => {
      const { data, error } = await supabase.from("quotations").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useQuotationRates() {
  return useQuery({
    queryKey: ["quotation_rates"],
    queryFn: async (): Promise<QuotationRate[]> => {
      const { data, error } = await supabase
        .from("quotation_rates")
        .select("*")
        .order("min_weight_g");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Ensure a quotation exists for company+mode and return its id. */
export function useEnsureQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ company_id, mode }: { company_id: string; mode: string }) => {
      const { data: existing } = await supabase
        .from("quotations")
        .select("id")
        .eq("company_id", company_id)
        .eq("mode", mode)
        .maybeSingle();
      if (existing?.id) return existing.id;
      const { data, error } = await supabase
        .from("quotations")
        .insert({ company_id, mode })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
  });
}

export function useUpsertQuotationRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"quotation_rates"> & { id?: string }) => {
      const { error } = await supabase.from("quotation_rates").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotation_rates"] }),
  });
}

export function useDeleteQuotationRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotation_rates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotation_rates"] }),
  });
}

/* ----------------------------- Rate cards ---------------------------- */
export function useRateCards(companyId?: string) {
  return useQuery({
    queryKey: ["rate_cards", companyId ?? "all"],
    queryFn: async (): Promise<RateCard[]> => {
      let q = supabase.from("rate_cards").select("*").order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"rate_cards"> & { id?: string }) => {
      const { error } = await supabase.from("rate_cards").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate_cards"] }),
  });
}

export function useDeleteRateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rate_cards"] }),
  });
}

/* ------------------------------ Dockets ------------------------------ */
export function useDockets() {
  return useQuery({
    queryKey: ["dockets"],
    queryFn: async (): Promise<Docket[]> => {
      const { data, error } = await supabase
        .from("dockets")
        .select("*")
        .order("scanned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddDocket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"dockets">) => {
      const { error } = await supabase.from("dockets").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dockets"] }),
  });
}

export function useDeleteDocket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dockets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dockets"] }),
  });
}

/* --------------------------- Courier reports ------------------------- */
export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async (): Promise<CourierReport[]> => {
      const { data, error } = await supabase
        .from("courier_reports")
        .select("*")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReportRows() {
  return useQuery({
    queryKey: ["report_rows"],
    queryFn: async (): Promise<CourierReportRow[]> => {
      const { data, error } = await supabase
        .from("courier_report_rows")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courier_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report_rows"] });
    },
  });
}

/* ---------------------------- Billing records ------------------------ */
export function useBillingRecords() {
  return useQuery({
    queryKey: ["billing_records"],
    queryFn: async (): Promise<BillingRecord[]> => {
      const { data, error } = await supabase
        .from("billing_records")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaveBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: TablesInsert<"billing_records">[]) => {
      const { error } = await supabase.from("billing_records").insert(records);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing_records"] }),
  });
}

export function useClearBilling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("billing_records")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing_records"] }),
  });
}

/**
 * Fully delete a shipment record by docket number: removes it from the scanned
 * dockets, generated billing records, billing edits, and the uploaded courier
 * report rows. Dashboard and all other views refresh via query invalidation.
 */
export function useDeleteBillingDocket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      docketNumber,
      companyId,
    }: {
      docketNumber: string;
      companyId: string;
    }) => {
      const dn = docketNumber.trim();
      const results = await Promise.all([
        supabase.from("billing_records").delete().eq("docket_number", dn).eq("company_id", companyId),
        supabase.from("billing_edits").delete().eq("docket_number", dn).eq("company_id", companyId),
        supabase.from("dockets").delete().eq("docket_number", dn).eq("company_id", companyId),
        supabase.from("courier_report_rows").delete().eq("docket_number", dn),
      ]);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing_records"] });
      qc.invalidateQueries({ queryKey: ["billing_edits"] });
      qc.invalidateQueries({ queryKey: ["dockets"] });
      qc.invalidateQueries({ queryKey: ["report_rows"] });
    },
  });
}

/* ---------------------------- Billing edits ------------------------- */
export function useBillingEdits() {
  return useQuery({
    queryKey: ["billing_edits"],
    queryFn: async (): Promise<Tables<"billing_edits">[]> => {
      const { data, error } = await supabase.from("billing_edits").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertBillingEdit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"billing_edits">) => {
      const { error } = await supabase
        .from("billing_edits")
        .upsert(payload, { onConflict: "company_id,docket_number" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing_edits"] }),
  });
}