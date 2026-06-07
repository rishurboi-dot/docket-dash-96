import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import type {
  BillingRecord,
  Company,
  CourierReport,
  CourierReportRow,
  Docket,
  RateCard,
  Zone,
} from "./billing";

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