import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  useCompanies,
  useDeleteQuotationRate,
  useEnsureQuotation,
  useQuotationRates,
  useQuotations,
  useUpsertQuotationRate,
  useZones,
} from "@/lib/queries";
import { MODES, RATE_UNITS, slabLabel, type RateUnit } from "@/lib/billing";

export const Route = createFileRoute("/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — SwiftBill" },
      { name: "description", content: "Build per-company rate quotations by mode, zone and weight slab." },
    ],
  }),
  component: QuotationsPage,
});

const emptyForm = {
  zone_id: "",
  min_kg: "0",
  max_kg: "0.25",
  rate: "0",
  rate_unit: "flat" as RateUnit,
  available: true,
};

function QuotationsPage() {
  const companies = useCompanies();
  const zones = useZones();
  const quotations = useQuotations();
  const rates = useQuotationRates();
  const ensureQuotation = useEnsureQuotation();
  const upsert = useUpsertQuotationRate();
  const del = useDeleteQuotationRate();

  const [companyId, setCompanyId] = useState("");
  const [mode, setMode] = useState<string>("Surface");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const quotation = quotations.data?.find(
    (q) => q.company_id === companyId && q.mode === mode,
  );

  const zoneName = (id: string) => zones.data?.find((z) => z.id === id)?.name ?? "—";

  const slabs = useMemo(() => {
    if (!quotation) return [];
    return (rates.data ?? [])
      .filter((r) => r.quotation_id === quotation.id)
      .sort((a, b) =>
        zoneName(a.zone_id).localeCompare(zoneName(b.zone_id)) ||
        a.min_weight_g - b.min_weight_g,
      );
  }, [rates.data, quotation, zones.data]);

  const save = async () => {
    if (!companyId) return toast.error("Select a company.");
    if (!form.zone_id) return toast.error("Select a zone.");
    try {
      const quotationId = quotation?.id ?? (await ensureQuotation.mutateAsync({ company_id: companyId, mode }));
      await upsert.mutateAsync({
        quotation_id: quotationId,
        zone_id: form.zone_id,
        min_weight_g: Math.round(Number(form.min_kg) * 1000),
        max_weight_g: form.max_kg ? Math.round(Number(form.max_kg) * 1000) : null,
        rate: Number(form.rate) || 0,
        rate_unit: form.rate_unit,
        available: form.available,
      });
      toast.success("Slab saved");
      setOpen(false);
      setForm(emptyForm);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AppLayout
      title="Quotations"
      description="Each company has its own rate sheet per mode. Slabs are matched automatically during billing."
      actions={
        <Button size="lg" onClick={() => { setForm(emptyForm); setOpen(true); }} disabled={!companyId}>
          <Plus className="mr-1 h-4 w-4" /> Add slab
        </Button>
      }
    >
      <Card className="mb-6 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
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
          <div>
            <Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        {!companyId ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            Select a company to build its quotation.
          </div>
        ) : slabs.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone</TableHead>
                <TableHead>Weight slab</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slabs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Badge variant="secondary">{zoneName(r.zone_id)}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{slabLabel(r)}</TableCell>
                  <TableCell className="text-right font-medium">{r.available ? `₹${Number(r.rate)}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {RATE_UNITS.find((u) => u.value === r.rate_unit)?.label ?? r.rate_unit}
                  </TableCell>
                  <TableCell>
                    {r.available ? (
                      <Badge className="bg-success text-success-foreground">Available</Badge>
                    ) : (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">Not available</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <Tags className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No slabs for this company/mode yet. Add one to start.</p>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add rate slab</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Zone</Label>
              <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                <SelectContent>
                  {zones.data?.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From (kg)</Label>
              <Input type="number" step="0.001" value={form.min_kg} onChange={(e) => setForm({ ...form, min_kg: e.target.value })} />
            </div>
            <div>
              <Label>To (kg, blank = ∞)</Label>
              <Input type="number" step="0.001" value={form.max_kg} onChange={(e) => setForm({ ...form, max_kg: e.target.value })} />
            </div>
            <div>
              <Label>Rate (₹)</Label>
              <Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </div>
            <div>
              <Label>Rate type</Label>
              <Select value={form.rate_unit} onValueChange={(v) => setForm({ ...form, rate_unit: v as RateUnit })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RATE_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Service available</Label>
                <p className="text-xs text-muted-foreground">Turn off to mark this slab as NOT AVAILABLE.</p>
              </div>
              <Switch checked={form.available} onCheckedChange={(v) => setForm({ ...form, available: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending || ensureQuotation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
