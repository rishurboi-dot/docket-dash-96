import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  useCompanies,
  useEnsureQuotation,
  useQuotationRates,
  useQuotations,
  useZones,
} from "@/lib/queries";
import type { Zone } from "@/lib/billing";

export const Route = createFileRoute("/_authenticated/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — SwiftBill" },
      { name: "description", content: "Per-company courier rate cards for standard and priority (fast track) services." },
    ],
  }),
  component: QuotationsPage,
});

/** Preferred display order for zone rows. */
const ZONE_ORDER = ["NCR", "Regional", "Metro", "ROI", "Special"];

/** Editable rate-card columns. Each holds one rate value per zone. */
type CellKey =
  | "s250"
  | "s500"
  | "sAdd"
  | "sAir5"
  | "sSur5"
  | "p500"
  | "pAdd"
  | "pAir10";

type Draft = Record<string, Record<CellKey, string>>;

const STANDARD_COLS: { key: CellKey; label: string }[] = [
  { key: "s250", label: "250g" },
  { key: "s500", label: "500g" },
  { key: "sAdd", label: "Add 500g" },
  { key: "sAir5", label: "Above 5kg Air" },
  { key: "sSur5", label: "Above 5kg Surface" },
];

const PRIORITY_COLS: { key: CellKey; label: string }[] = [
  { key: "p500", label: "500g" },
  { key: "pAdd", label: "Add 500g" },
  { key: "pAir10", label: "Above 10kg Air" },
];

const num = (v: string) => {
  const n = Number((v ?? "").trim());
  return Number.isFinite(n) ? n : 0;
};

function QuotationsPage() {
  const companies = useCompanies();
  const zones = useZones();
  const quotations = useQuotations();
  const rates = useQuotationRates();
  const ensureQuotation = useEnsureQuotation();
  const qc = useQueryClient();

  const [companyId, setCompanyId] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const orderedZones = useMemo<Zone[]>(() => {
    const list = zones.data ?? [];
    const ordered = ZONE_ORDER
      .map((name) => list.find((z) => z.name === name))
      .filter((z): z is Zone => Boolean(z));
    const rest = list.filter((z) => !ZONE_ORDER.includes(z.name));
    return [...ordered, ...rest];
  }, [zones.data]);

  const buildDraft = useMemo(
    () => () => {
      const list = rates.data ?? [];
      const quotes = (quotations.data ?? []).filter((q) => q.company_id === companyId);
      const qid = (mode: string) => quotes.find((q) => q.mode === mode)?.id;
      const air = qid("Air");
      const sur = qid("Surface");
      const pri = qid("Priority");

      const cell = (
        quotationId: string | undefined,
        zoneId: string,
        pred: (r: (typeof list)[number]) => boolean,
      ) => {
        if (!quotationId) return "";
        const r = list.find(
          (x) => x.quotation_id === quotationId && x.zone_id === zoneId && pred(x),
        );
        return r ? String(Number(r.rate)) : "";
      };

      const priFlat = (zoneId: string) => {
        if (!pri) return "";
        const fl = list
          .filter(
            (x) => x.quotation_id === pri && x.zone_id === zoneId && x.rate_unit === "flat",
          )
          .sort((a, b) => (b.max_weight_g ?? 0) - (a.max_weight_g ?? 0));
        return fl[0] ? String(Number(fl[0].rate)) : "";
      };

      const d: Draft = {};
      for (const z of orderedZones) {
        d[z.id] = {
          s250: cell(air, z.id, (r) => r.rate_unit === "flat" && r.min_weight_g === 0),
          s500: cell(air, z.id, (r) => r.rate_unit === "flat" && r.min_weight_g === 250),
          sAdd: cell(air, z.id, (r) => r.rate_unit === "add_per_500g"),
          sAir5: cell(air, z.id, (r) => r.rate_unit === "per_kg"),
          sSur5: cell(sur, z.id, (r) => r.rate_unit === "per_kg"),
          p500: priFlat(z.id),
          pAdd: cell(pri, z.id, (r) => r.rate_unit === "add_per_500g"),
          pAir10: cell(pri, z.id, (r) => r.rate_unit === "per_kg"),
        };
      }
      return d;
    },
    [rates.data, quotations.data, companyId, orderedZones],
  );

  // Load (or reload) the card whenever the company or source data changes,
  // unless the user has unsaved edits in progress.
  useEffect(() => {
    if (!companyId) {
      setDraft({});
      setDirty(false);
      return;
    }
    if (dirty) return;
    setDraft(buildDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, buildDraft]);

  const setCell = (zoneId: string, key: CellKey, value: string) => {
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      [zoneId]: { ...prev[zoneId], [key]: value },
    }));
  };

  const cancel = () => {
    setDraft(buildDraft());
    setDirty(false);
  };

  const save = async () => {
    if (!companyId) return toast.error("Select a company.");
    setSaving(true);
    try {
      const [air, sur, pri] = await Promise.all([
        ensureQuotation.mutateAsync({ company_id: companyId, mode: "Air" }),
        ensureQuotation.mutateAsync({ company_id: companyId, mode: "Surface" }),
        ensureQuotation.mutateAsync({ company_id: companyId, mode: "Priority" }),
      ]);

      const rows: {
        quotation_id: string;
        zone_id: string;
        min_weight_g: number;
        max_weight_g: number | null;
        rate: number;
        rate_unit: string;
        available: boolean;
      }[] = [];

      for (const z of orderedZones) {
        const c = draft[z.id];
        if (!c) continue;
        // Standard base slabs are shared by Air & Surface shipments.
        for (const q of [air, sur]) {
          rows.push(
            { quotation_id: q, zone_id: z.id, min_weight_g: 0, max_weight_g: 250, rate: num(c.s250), rate_unit: "flat", available: true },
            { quotation_id: q, zone_id: z.id, min_weight_g: 250, max_weight_g: 500, rate: num(c.s500), rate_unit: "flat", available: true },
            { quotation_id: q, zone_id: z.id, min_weight_g: 500, max_weight_g: 5000, rate: num(c.sAdd), rate_unit: "add_per_500g", available: true },
          );
        }
        // Heavy slabs differ by transport mode.
        rows.push(
          { quotation_id: air, zone_id: z.id, min_weight_g: 5000, max_weight_g: null, rate: num(c.sAir5), rate_unit: "per_kg", available: true },
          { quotation_id: sur, zone_id: z.id, min_weight_g: 5000, max_weight_g: null, rate: num(c.sSur5), rate_unit: "per_kg", available: true },
        );
        // Priority (Fast Track) service.
        rows.push(
          { quotation_id: pri, zone_id: z.id, min_weight_g: 0, max_weight_g: 500, rate: num(c.p500), rate_unit: "flat", available: true },
          { quotation_id: pri, zone_id: z.id, min_weight_g: 500, max_weight_g: 10000, rate: num(c.pAdd), rate_unit: "add_per_500g", available: true },
          { quotation_id: pri, zone_id: z.id, min_weight_g: 10000, max_weight_g: null, rate: num(c.pAir10), rate_unit: "per_kg", available: true },
        );
      }

      const { error: delErr } = await supabase
        .from("quotation_rates")
        .delete()
        .in("quotation_id", [air, sur, pri]);
      if (delErr) throw delErr;
      const { error: insErr } = await supabase.from("quotation_rates").insert(rows);
      if (insErr) throw insErr;

      await qc.invalidateQueries({ queryKey: ["quotation_rates"] });
      await qc.invalidateQueries({ queryKey: ["quotations"] });
      setDirty(false);
      toast.success("Rate card saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const renderCard = (
    title: string,
    subtitle: string,
    cols: { key: CellKey; label: string }[],
  ) => (
    <Card style={{ boxShadow: "var(--shadow-card)" }} className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-28">Zone</TableHead>
              {cols.map((col) => (
                <TableHead key={col.key} className="text-right">{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedZones.map((z) => (
              <TableRow key={z.id}>
                <TableCell>
                  <Badge variant="secondary">{z.name}</Badge>
                </TableCell>
                {cols.map((col) => (
                  <TableCell key={col.key} className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        className="h-9 w-24 text-right font-mono"
                        value={draft[z.id]?.[col.key] ?? ""}
                        onChange={(e) => setCell(z.id, col.key, e.target.value)}
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );

  return (
    <AppLayout
      title="Quotations"
      description="Per-company courier rate card. Standard rates bill normal shipments; priority rates bill Fast Track shipments."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={cancel} disabled={!companyId || !dirty || saving}>
            <X className="mr-1 h-4 w-4" /> Cancel
          </Button>
          <Button size="lg" onClick={save} disabled={!companyId || !dirty || saving}>
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
        </div>
      }
    >
      <Card className="mb-6 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="max-w-sm">
          <Label>Company</Label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {!companyId ? (
        <Card className="px-5 py-16 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <Tags className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select a company to view and edit its rate card.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {renderCard(
            "Standard Services",
            "Air & Surface shipments. Base slabs shared; heavy shipments priced per kg by mode.",
            STANDARD_COLS,
          )}
          {renderCard(
            "Priority Services (Fast Track)",
            "Express Fast Track shipments billed on the priority rate card.",
            PRIORITY_COLS,
          )}
        </div>
      )}
    </AppLayout>
  );
}
