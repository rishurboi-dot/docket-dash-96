import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useDeleteRateCard,
  useRateCards,
  useUpsertRateCard,
  useZones,
} from "@/lib/queries";
import { formatCurrency, MODES, type RateCard } from "@/lib/billing";

export const Route = createFileRoute("/rates")({
  head: () => ({
    meta: [
      { title: "Rate Cards — SwiftBill" },
      { name: "description", content: "Per-company quotation rate cards by zone, mode and weight slab." },
    ],
  }),
  component: RatesPage,
});

const empty = {
  company_id: "",
  zone_id: "",
  mode: "Surface",
  weight_from: "0",
  weight_to: "999999",
  base_charge: "0",
  per_kg_charge: "0",
};

function RatesPage() {
  const companies = useCompanies();
  const zones = useZones();
  const rates = useRateCards();
  const upsert = useUpsertRateCard();
  const del = useDeleteRateCard();
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RateCard | null>(null);
  const [form, setForm] = useState(empty);

  const companyName = (id: string) => companies.data?.find((c) => c.id === id)?.name ?? "—";
  const zoneName = (id: string) => zones.data?.find((z) => z.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const all = rates.data ?? [];
    return filter === "all" ? all : all.filter((r) => r.company_id === filter);
  }, [rates.data, filter]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, company_id: filter !== "all" ? filter : "" });
    setOpen(true);
  };
  const openEdit = (r: RateCard) => {
    setEditing(r);
    setForm({
      company_id: r.company_id,
      zone_id: r.zone_id,
      mode: r.mode,
      weight_from: String(r.weight_from),
      weight_to: String(r.weight_to),
      base_charge: String(r.base_charge),
      per_kg_charge: String(r.per_kg_charge),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.company_id || !form.zone_id) {
      toast.error("Company and zone are required.");
      return;
    }
    try {
      await upsert.mutateAsync({
        ...(editing ? { id: editing.id } : {}),
        company_id: form.company_id,
        zone_id: form.zone_id,
        mode: form.mode,
        weight_from: Number(form.weight_from) || 0,
        weight_to: Number(form.weight_to) || 0,
        base_charge: Number(form.base_charge) || 0,
        per_kg_charge: Number(form.per_kg_charge) || 0,
      });
      toast.success(editing ? "Rate card updated" : "Rate card added");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const noSetup = !companies.data?.length || !zones.data?.length;

  return (
    <AppLayout
      title="Rate Cards"
      description="Quotations per company. Charge = base + per-kg × weight, matched by zone, mode and weight slab."
      actions={
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew} disabled={noSetup}>
            <Plus className="mr-1 h-4 w-4" /> Add rate
          </Button>
        </div>
      }
    >
      {noSetup && (
        <Card className="mb-4 border-warning/40 bg-warning/10 p-4 text-sm">
          Add at least one company and one zone before creating rate cards.
        </Card>
      )}
      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        {filtered.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Weight slab (kg)</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Per kg</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{companyName(r.company_id)}</TableCell>
                  <TableCell>{zoneName(r.zone_id)}</TableCell>
                  <TableCell>{r.mode}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {r.weight_from} – {r.weight_to}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.base_charge))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(r.per_kg_charge))}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
            <p className="text-sm text-muted-foreground">No rate cards yet.</p>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit rate card" : "Add rate card"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Company</Label>
              <Select
                value={form.company_id}
                onValueChange={(v) => setForm({ ...form, company_id: v })}
              >
                <SelectTrigger>
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
              <Label>Zone</Label>
              <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                <SelectTrigger>
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
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Weight from (kg)</Label>
              <Input
                type="number"
                value={form.weight_from}
                onChange={(e) => setForm({ ...form, weight_from: e.target.value })}
              />
            </div>
            <div>
              <Label>Weight to (kg)</Label>
              <Input
                type="number"
                value={form.weight_to}
                onChange={(e) => setForm({ ...form, weight_to: e.target.value })}
              />
            </div>
            <div>
              <Label>Base charge</Label>
              <Input
                type="number"
                value={form.base_charge}
                onChange={(e) => setForm({ ...form, base_charge: e.target.value })}
              />
            </div>
            <div>
              <Label>Per kg charge</Label>
              <Input
                type="number"
                value={form.per_kg_charge}
                onChange={(e) => setForm({ ...form, per_kg_charge: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}