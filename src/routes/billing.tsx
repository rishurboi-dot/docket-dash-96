import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileText,
  Flag,
  Pencil,
  Package,
  Receipt,
  Save,
  Scale,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/StatCard";
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
import { exportRowsToExcel } from "@/lib/excel";
import { exportBillingPdf } from "@/lib/pdf";
import {
  calcSlabCharge,
  detectZone,
  formatCurrency,
  MODES,
  normalizeMode,
} from "@/lib/billing";
import {
  useBillingRecords,
  useBillingEdits,
  useCities,
  useCompanies,
  useDockets,
  useQuotationRates,
  useQuotations,
  useReportRows,
  useSaveBilling,
  useUpsertBillingEdit,
  useZones,
} from "@/lib/queries";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Generate Billing — SwiftBill" },
      { name: "description", content: "Select a company and generate billing for matched dockets automatically." },
    ],
  }),
  component: BillingPage,
});

interface BillRow {
  docket_number: string;
  date: string | null;
  name: string;
  place: string;
  zone_id: string | null;
  zone_name: string;
  mode: string;
  weight: number;
  amount: number;
  available: boolean;
}

interface MergedRow extends BillRow {
  marked: boolean;
  notes: string;
  edited: boolean;
}

interface EditDraft {
  date: string;
  name: string;
  place: string;
  zone_id: string | null;
  mode: string;
  weight: string;
  amount: string;
  notes: string;
}

function rawField(raw: unknown, key: string): string {
  if (raw && typeof raw === "object" && key in (raw as Record<string, unknown>)) {
    const v = (raw as Record<string, unknown>)[key];
    return v == null ? "" : String(v);
  }
  return "";
}

function BillingPage() {
  const dockets = useDockets();
  const reportRows = useReportRows();
  const zones = useZones();
  const cities = useCities();
  const companies = useCompanies();
  const quotations = useQuotations();
  const rates = useQuotationRates();
  const billing = useBillingRecords();
  const edits = useBillingEdits();
  const saveBilling = useSaveBilling();
  const upsertEdit = useUpsertBillingEdit();
  const qc = useQueryClient();

  const [companyId, setCompanyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "marked">("all");
  const [editingDocket, setEditingDocket] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  const company = companies.data?.find((c) => c.id === companyId) ?? null;

  const billRows = useMemo<BillRow[]>(() => {
    if (!companyId) return [];
    const rows = reportRows.data ?? [];
    const zoneList = zones.data ?? [];
    const cityList = cities.data ?? [];
    const rateList = rates.data ?? [];
    const quotes = (quotations.data ?? []).filter((q) => q.company_id === companyId);

    const rowByDocket = new Map<string, (typeof rows)[number]>();
    for (const r of rows) rowByDocket.set(r.docket_number.trim(), r);

    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 86_400_000 - 1 : null;

    const out: BillRow[] = [];
    for (const d of dockets.data ?? []) {
      const row = rowByDocket.get(d.docket_number.trim());
      if (!row) continue; // unmatched -> ignored
      const bookingRaw = rawField(row.raw, "bookingDate");
      const bookingTs = bookingRaw ? new Date(bookingRaw).getTime() : null;
      if (fromTs != null && bookingTs != null && bookingTs < fromTs) continue;
      if (toTs != null && bookingTs != null && bookingTs > toTs) continue;

      const mode = normalizeMode(row.mode);
      const place = row.destination ?? rawField(row.raw, "receiverCity");
      const zone = detectZone(place, cityList, zoneList);
      const weight = Number(row.weight ?? 0);
      const quote = quotes.find((q) => q.mode === mode);
      const zoneRates = quote
        ? rateList.filter((r) => r.quotation_id === quote.id && r.zone_id === zone.zoneId)
        : [];
      const result = calcSlabCharge(zoneRates, weight);
      out.push({
        docket_number: d.docket_number,
        date: bookingRaw || null,
        name: rawField(row.raw, "receiverName"),
        place,
        zone_id: zone.zoneId,
        zone_name: zone.zoneName,
        mode,
        weight,
        amount: result.amount,
        available: result.available,
      });
    }
    return out;
  }, [companyId, dockets.data, reportRows.data, zones.data, cities.data, rates.data, quotations.data, from, to]);

  // Merge persisted edits / marks / notes onto computed rows.
  const mergedRows = useMemo<MergedRow[]>(() => {
    const editByDocket = new Map(
      (edits.data ?? [])
        .filter((e) => e.company_id === companyId)
        .map((e) => [e.docket_number.trim(), e]),
    );
    return billRows.map((base) => {
      const e = editByDocket.get(base.docket_number.trim());
      if (!e) return { ...base, marked: false, notes: "", edited: false };
      const fields = Array.isArray(e.edited_fields) ? (e.edited_fields as string[]) : [];
      const has = (f: string) => fields.includes(f);
      const amount = has("amount") && e.amount != null ? Number(e.amount) : base.amount;
      return {
        ...base,
        date: has("date") ? e.date ?? null : base.date,
        name: has("name") ? e.name ?? "" : base.name,
        place: has("place") ? e.place ?? "" : base.place,
        zone_id: has("zone") ? e.zone_id ?? base.zone_id : base.zone_id,
        zone_name: has("zone") ? e.zone_name ?? base.zone_name : base.zone_name,
        mode: has("mode") ? e.mode ?? base.mode : base.mode,
        weight: has("weight") && e.weight != null ? Number(e.weight) : base.weight,
        amount,
        available: has("amount") ? true : base.available,
        marked: e.marked,
        notes: e.notes ?? "",
        edited: fields.length > 0,
      };
    });
  }, [billRows, edits.data, companyId]);

  const visibleRows = useMemo(
    () => (filter === "marked" ? mergedRows.filter((r) => r.marked) : mergedRows),
    [mergedRows, filter],
  );

  const billable = mergedRows.filter((r) => r.available);
  const totalWeight = mergedRows.reduce((s, r) => s + r.weight, 0);
  const totalAmount = billable.reduce((s, r) => s + r.amount, 0);
  const markedCount = mergedRows.filter((r) => r.marked).length;

  const zoneBreakdown = useMemo(() => {
    const m = new Map<string, { count: number; amount: number }>();
    for (const r of billable) {
      const e = m.get(r.zone_name) ?? { count: 0, amount: 0 };
      e.count += 1;
      e.amount += r.amount;
      m.set(r.zone_name, e);
    }
    return [...m.entries()];
  }, [billable]);

  const modeBreakdown = useMemo(() => {
    const m = new Map<string, { count: number; amount: number }>();
    for (const r of billable) {
      const e = m.get(r.mode) ?? { count: 0, amount: 0 };
      e.count += 1;
      e.amount += r.amount;
      m.set(r.mode, e);
    }
    return [...m.entries()];
  }, [billable]);

  const baseByDocket = useMemo(
    () => new Map(billRows.map((r) => [r.docket_number, r])),
    [billRows],
  );

  const startEdit = (r: MergedRow) => {
    setEditingDocket(r.docket_number);
    setDraft({
      date: r.date ? r.date.slice(0, 10) : "",
      name: r.name,
      place: r.place,
      zone_id: r.zone_id,
      mode: r.mode,
      weight: String(r.weight),
      amount: String(r.amount),
      notes: r.notes,
    });
  };

  const cancelEdit = () => {
    setEditingDocket(null);
    setDraft(null);
  };

  const saveEdit = async (r: MergedRow) => {
    if (!draft) return;
    const base = baseByDocket.get(r.docket_number);
    if (!base) return;
    const zoneList = zones.data ?? [];
    const newZone = zoneList.find((z) => z.id === draft.zone_id) ?? null;
    const edited: string[] = [];
    const baseDate = base.date ? base.date.slice(0, 10) : "";
    if (draft.date !== baseDate) edited.push("date");
    if (draft.name !== base.name) edited.push("name");
    if (draft.place !== base.place) edited.push("place");
    if ((draft.zone_id ?? null) !== (base.zone_id ?? null)) edited.push("zone");
    if (draft.mode !== base.mode) edited.push("mode");
    if (Number(draft.weight) !== base.weight) edited.push("weight");
    if (Number(draft.amount) !== base.amount) edited.push("amount");
    try {
      await upsertEdit.mutateAsync({
        company_id: companyId,
        docket_number: r.docket_number,
        date: draft.date || null,
        name: draft.name,
        place: draft.place,
        zone_id: draft.zone_id,
        zone_name: newZone?.name ?? r.zone_name,
        mode: draft.mode,
        weight: draft.weight === "" ? null : Number(draft.weight),
        amount: draft.amount === "" ? null : Number(draft.amount),
        notes: draft.notes || null,
        marked: r.marked,
        edited_fields: edited,
      });
      toast.success("Changes saved");
      cancelEdit();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleMark = async (r: MergedRow) => {
    const base = baseByDocket.get(r.docket_number);
    try {
      await upsertEdit.mutateAsync({
        company_id: companyId,
        docket_number: r.docket_number,
        marked: !r.marked,
        notes: r.notes || null,
        date: r.edited ? r.date : base?.date ?? null,
        name: r.name,
        place: r.place,
        zone_id: r.zone_id,
        zone_name: r.zone_name,
        mode: r.mode,
        weight: r.weight,
        amount: r.amount,
        edited_fields: r.edited
          ? (edits.data?.find(
              (e) => e.company_id === companyId && e.docket_number === r.docket_number,
            )?.edited_fields as string[]) ?? []
          : [],
      });
      toast.success(r.marked ? "Removed review mark" : "Marked for review");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const generate = async () => {
    if (!companyId) return toast.error("Select a company first.");
    if (!billable.length) return toast.error("No billable matched shipments.");
    setSaving(true);
    try {
      await saveBilling.mutateAsync(
        billable.map((r) => ({
          docket_number: r.docket_number,
          company_id: companyId,
          zone_id: r.zone_id,
          mode: r.mode,
          weight: r.weight,
          charge: r.amount,
        })),
      );
      await supabase
        .from("dockets")
        .update({ status: "billed" })
        .in("docket_number", billable.map((r) => r.docket_number));
      qc.invalidateQueries({ queryKey: ["dockets"] });
      toast.success(`Billing generated for ${billable.length} shipments`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    exportRowsToExcel(
      visibleRows.map((r, i) => ({
        "S.No": i + 1,
        Date: r.date ? new Date(r.date).toLocaleDateString() : "",
        Docket: r.docket_number,
        Name: r.name,
        Place: r.place,
        Zone: r.zone_name,
        "Weight (kg)": r.weight,
        Mode: r.mode,
        Amount: r.available ? r.amount : "NOT AVAILABLE",
        "Review Status": r.marked ? "Marked" : "",
        Notes: r.notes,
      })),
      `billing-${company?.name ?? "company"}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const exportPdf = () => {
    exportBillingPdf({
      companyName: company?.name ?? "—",
      dateRange: from || to ? `${from || "…"} to ${to || "…"}` : "All dates",
      rows: visibleRows,
      totalShipments: visibleRows.length,
      totalWeight,
      totalAmount,
    });
  };

  return (
    <AppLayout
      title="Generate Billing"
      description="Select a company, then bill all matched dockets automatically — zones, slabs and amounts are computed for you."
    >
      <Card className="mb-6 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>From date</Label>
            <Input type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>To date</Label>
            <Input type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" size="lg" onClick={generate} disabled={saving || !billable.length}>
              <Save className="mr-1 h-4 w-4" /> Generate Billing
            </Button>
          </div>
        </div>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Matched shipments" value={billRows.length} icon={CheckCircle2} />
        <StatCard label="Not available" value={billRows.length - billable.length} icon={XCircle} />
        <StatCard label="Total weight" value={`${totalWeight.toFixed(2)} kg`} icon={Scale} />
        <StatCard label="Total amount" value={formatCurrency(totalAmount)} icon={Receipt} />
      </div>

      {!companyId ? (
        <Card className="px-5 py-16 text-center text-sm text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
          <Package className="mx-auto mb-3 h-8 w-8 opacity-50" />
          Select a company above to preview and generate billing.
        </Card>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="mr-auto flex gap-1 rounded-md border p-0.5">
              <Button
                size="sm"
                variant={filter === "all" ? "default" : "ghost"}
                onClick={() => setFilter("all")}
              >
                All Records ({mergedRows.length})
              </Button>
              <Button
                size="sm"
                variant={filter === "marked" ? "default" : "ghost"}
                onClick={() => setFilter("marked")}
              >
                <Flag className="mr-1 h-3.5 w-3.5" /> Marked Only ({markedCount})
              </Button>
            </div>
            <Button variant="outline" onClick={exportExcel} disabled={!visibleRows.length}>
              <Download className="mr-1 h-4 w-4" /> Export Excel
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={!visibleRows.length}>
              <FileText className="mr-1 h-4 w-4" /> Export PDF
            </Button>
          </div>

          <Card style={{ boxShadow: "var(--shadow-card)" }}>
            {visibleRows.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-12">S.No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Docket</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Place</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRows.map((r, i) => {
                      const editing = editingDocket === r.docket_number && draft;
                      return (
                        <TableRow
                          key={r.docket_number}
                          className={
                            r.marked
                              ? "bg-amber-50 hover:bg-amber-100/70"
                              : r.edited
                                ? "bg-primary/5"
                                : undefined
                          }
                        >
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => toggleMark(r)}
                              title={r.marked ? "Unmark" : "Mark for review"}
                              className="text-muted-foreground transition-colors hover:text-amber-500"
                            >
                              <Flag
                                className={`h-4 w-4 ${r.marked ? "fill-amber-400 text-amber-500" : ""}`}
                              />
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {i + 1}
                            {r.edited && (
                              <Badge variant="outline" className="ml-1 border-primary/40 px-1 py-0 text-[10px] text-primary">
                                edited
                              </Badge>
                            )}
                          </TableCell>
                          {editing ? (
                            <>
                              <TableCell>
                                <Input
                                  type="date"
                                  className="h-8 w-36"
                                  value={draft.date}
                                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">{r.docket_number}</TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 w-32"
                                  value={draft.name}
                                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  className="h-8 w-28"
                                  value={draft.place}
                                  onChange={(e) => setDraft({ ...draft, place: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={draft.zone_id ?? ""}
                                  onValueChange={(v) => setDraft({ ...draft, zone_id: v })}
                                >
                                  <SelectTrigger className="h-8 w-28">
                                    <SelectValue placeholder="Zone" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {zones.data?.map((z) => (
                                      <SelectItem key={z.id} value={z.id}>
                                        {z.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  className="h-8 w-20 text-right"
                                  value={draft.weight}
                                  onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={draft.mode}
                                  onValueChange={(v) => setDraft({ ...draft, mode: v })}
                                >
                                  <SelectTrigger className="h-8 w-28">
                                    <SelectValue placeholder="Mode" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MODES.map((m) => (
                                      <SelectItem key={m} value={m}>
                                        {m}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  className="h-8 w-24 text-right"
                                  value={draft.amount}
                                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <Textarea
                                  rows={1}
                                  className="min-h-8 w-40"
                                  placeholder="Add notes…"
                                  value={draft.notes}
                                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => saveEdit(r)}
                                    disabled={upsertEdit.isPending}
                                    title="Save"
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={cancelEdit}
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell
                                className="cursor-pointer"
                                onClick={() => startEdit(r)}
                              >
                                {r.date ? new Date(r.date).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell className="cursor-pointer font-mono text-sm" onClick={() => startEdit(r)}>
                                {r.docket_number}
                              </TableCell>
                              <TableCell className="max-w-[160px] cursor-pointer truncate" onClick={() => startEdit(r)}>
                                {r.name || "—"}
                              </TableCell>
                              <TableCell className="cursor-pointer" onClick={() => startEdit(r)}>
                                {r.place || "—"}
                              </TableCell>
                              <TableCell className="cursor-pointer" onClick={() => startEdit(r)}>
                                <Badge variant="secondary">{r.zone_name}</Badge>
                              </TableCell>
                              <TableCell className="cursor-pointer text-right" onClick={() => startEdit(r)}>
                                {r.weight} kg
                              </TableCell>
                              <TableCell className="cursor-pointer" onClick={() => startEdit(r)}>
                                {r.mode}
                              </TableCell>
                              <TableCell className="cursor-pointer text-right font-medium" onClick={() => startEdit(r)}>
                                {r.available ? (
                                  formatCurrency(r.amount)
                                ) : (
                                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                                    NOT AVAILABLE
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[180px] cursor-pointer text-sm text-muted-foreground" onClick={() => startEdit(r)}>
                                {r.notes ? <span className="line-clamp-2">{r.notes}</span> : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => startEdit(r)}
                                  title="Edit row"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                {filter === "marked"
                  ? "No rows marked for review yet. Use the flag icon to mark rows."
                  : "No matched shipments for this selection. Scan dockets and upload the courier report first."}
              </div>
            )}
          </Card>

          {billable.length > 0 && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <h3 className="mb-3 font-semibold">Zone breakdown</h3>
                <div className="space-y-2 text-sm">
                  {zoneBreakdown.map(([z, e]) => (
                    <div key={z} className="flex items-center justify-between border-b pb-1.5">
                      <span>{z} <span className="text-muted-foreground">· {e.count}</span></span>
                      <span className="font-medium">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <h3 className="mb-3 font-semibold">Mode breakdown</h3>
                <div className="space-y-2 text-sm">
                  {modeBreakdown.map(([m, e]) => (
                    <div key={m} className="flex items-center justify-between border-b pb-1.5">
                      <span>{m} <span className="text-muted-foreground">· {e.count}</span></span>
                      <span className="font-medium">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        {billing.data?.length ?? 0} billing records saved so far. Generating again adds new records.
      </p>
    </AppLayout>
  );
}
