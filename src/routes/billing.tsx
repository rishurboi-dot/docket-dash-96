import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, Receipt, Save, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { exportRowsToExcel } from "@/lib/excel";
import {
  calcCharge,
  findRateCard,
  formatCurrency,
  normalizeMode,
  type BillingPreview,
} from "@/lib/billing";
import {
  useBillingRecords,
  useClearBilling,
  useCompanies,
  useDockets,
  useRateCards,
  useReportRows,
  useSaveBilling,
  useZones,
} from "@/lib/queries";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — SwiftBill" },
      { name: "description", content: "Match dockets to courier reports and generate billing." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const dockets = useDockets();
  const reportRows = useReportRows();
  const zones = useZones();
  const companies = useCompanies();
  const rates = useRateCards();
  const billing = useBillingRecords();
  const saveBilling = useSaveBilling();
  const clearBilling = useClearBilling();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const preview = useMemo<BillingPreview[]>(() => {
    const rows = reportRows.data ?? [];
    const zoneList = zones.data ?? [];
    const rateList = rates.data ?? [];
    const companyList = companies.data ?? [];
    // last report row per docket number
    const rowByDocket = new Map<string, (typeof rows)[number]>();
    for (const r of rows) rowByDocket.set(r.docket_number, r);

    return (dockets.data ?? []).map((d) => {
      const company = companyList.find((c) => c.id === d.company_id) ?? null;
      const row = rowByDocket.get(d.docket_number);
      const base: BillingPreview = {
        docket_number: d.docket_number,
        company_id: d.company_id,
        company_name: company?.name ?? "—",
        zone_id: null,
        zone_name: "—",
        mode: "—",
        weight: null,
        charge: 0,
        rate_card_id: null,
        report_id: null,
        matched: false,
        reason: "No matching report row",
      };
      if (!row) return base;
      base.report_id = row.report_id;
      base.weight = row.weight ?? null;
      base.mode = normalizeMode(row.mode);
      const zone = zoneList.find(
        (z) => z.code.toLowerCase() === (row.zone_code ?? "").toLowerCase(),
      );
      base.zone_id = zone?.id ?? null;
      base.zone_name = zone?.name ?? row.zone_code ?? row.destination ?? "—";
      if (!company) {
        base.reason = "Docket has no company assigned";
        return base;
      }
      const card = findRateCard(
        rateList.filter((c) => c.company_id === company.id),
        { zoneId: zone?.id ?? null, mode: row.mode, weight: row.weight },
      );
      if (!card) {
        base.reason = zone
          ? "No rate card for this zone/mode"
          : "No rate card for this mode/weight";
        return base;
      }
      // If zone was unknown, adopt the matched card's zone for reporting.
      if (!zone && card.zone_id) {
        const cardZone = zoneList.find((z) => z.id === card.zone_id);
        base.zone_id = card.zone_id;
        base.zone_name = cardZone?.name ?? base.zone_name;
      }
      base.rate_card_id = card.id;
      base.charge = calcCharge(card, row.weight);
      base.matched = true;
      base.reason = "Matched";
      return base;
    });
  }, [dockets.data, reportRows.data, zones.data, companies.data, rates.data]);

  const matched = preview.filter((p) => p.matched);
  const total = matched.reduce((s, p) => s + p.charge, 0);

  const generate = async () => {
    if (!matched.length) {
      toast.error("No matched dockets to bill.");
      return;
    }
    setSaving(true);
    try {
      await saveBilling.mutateAsync(
        matched.map((p) => ({
          docket_number: p.docket_number,
          company_id: p.company_id,
          zone_id: p.zone_id,
          mode: p.mode,
          weight: p.weight,
          charge: p.charge,
          rate_card_id: p.rate_card_id,
          report_id: p.report_id,
        })),
      );
      const numbers = matched.map((p) => p.docket_number);
      await supabase.from("dockets").update({ status: "billed" }).in("docket_number", numbers);
      qc.invalidateQueries({ queryKey: ["dockets"] });
      toast.success(`Generated billing for ${matched.length} dockets`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const exportPreview = () => {
    exportRowsToExcel(
      preview.map((p) => ({
        Docket: p.docket_number,
        Company: p.company_name,
        Zone: p.zone_name,
        Mode: p.mode,
        "Weight (kg)": p.weight ?? "",
        Charge: p.charge,
        Status: p.matched ? "Matched" : "Unmatched",
        Note: p.reason,
      })),
      `billing-preview-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const exportSaved = () => {
    const records = billing.data ?? [];
    exportRowsToExcel(
      records.map((r) => ({
        Docket: r.docket_number,
        Company: companies.data?.find((c) => c.id === r.company_id)?.name ?? "",
        Zone: zones.data?.find((z) => z.id === r.zone_id)?.name ?? "",
        Mode: r.mode ?? "",
        "Weight (kg)": r.weight ?? "",
        Charge: Number(r.charge),
        "Billed at": new Date(r.created_at).toLocaleString(),
      })),
      `billing-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const savedTotal = (billing.data ?? []).reduce((s, r) => s + Number(r.charge), 0);

  return (
    <AppLayout
      title="Billing"
      description="Match scanned dockets against uploaded reports and generate charges."
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Matched" value={matched.length} icon={CheckCircle2} />
        <StatCard
          label="Unmatched"
          value={preview.length - matched.length}
          icon={XCircle}
        />
        <StatCard label="Preview total" value={formatCurrency(total)} icon={Receipt} />
      </div>

      <Tabs defaultValue="preview">
        <TabsList>
          <TabsTrigger value="preview">Preview ({preview.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved reports ({billing.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Button onClick={generate} disabled={saving || !matched.length}>
              <Save className="mr-1 h-4 w-4" /> Generate billing
            </Button>
            <Button variant="outline" onClick={exportPreview} disabled={!preview.length}>
              <Download className="mr-1 h-4 w-4" /> Export preview
            </Button>
          </div>
          <Card style={{ boxShadow: "var(--shadow-card)" }}>
            {preview.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Docket</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Charge</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((p) => (
                    <TableRow key={p.docket_number}>
                      <TableCell className="font-mono text-sm">{p.docket_number}</TableCell>
                      <TableCell>{p.company_name}</TableCell>
                      <TableCell>{p.zone_name}</TableCell>
                      <TableCell>{p.mode}</TableCell>
                      <TableCell className="text-right">{p.weight ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {p.matched ? formatCurrency(p.charge) : "—"}
                      </TableCell>
                      <TableCell>
                        {p.matched ? (
                          <Badge className="bg-success text-success-foreground">Matched</Badge>
                        ) : (
                          <Badge variant="outline" title={p.reason}>
                            {p.reason}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                Scan dockets and upload a report to see the billing preview.
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={exportSaved} disabled={!billing.data?.length}>
              <Download className="mr-1 h-4 w-4" /> Export report
            </Button>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => clearBilling.mutate()}
              disabled={!billing.data?.length}
            >
              Clear all
            </Button>
            <span className="ml-auto text-sm font-medium">
              Total billed: {formatCurrency(savedTotal)}
            </span>
          </div>
          <Card style={{ boxShadow: "var(--shadow-card)" }}>
            {billing.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Docket</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Charge</TableHead>
                    <TableHead>Billed at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billing.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">{r.docket_number}</TableCell>
                      <TableCell>
                        {companies.data?.find((c) => c.id === r.company_id)?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {zones.data?.find((z) => z.id === r.zone_id)?.name ?? "—"}
                      </TableCell>
                      <TableCell>{r.mode ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.weight ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(r.charge))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                No billing reports generated yet.
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}