import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  useCities,
  useDeleteCity,
  useDeleteZone,
  useUpsertCity,
  useUpsertZone,
  useZones,
} from "@/lib/queries";
import type { Zone } from "@/lib/billing";

export const Route = createFileRoute("/_authenticated/zones")({
  head: () => ({
    meta: [
      { title: "Zones & Cities — SwiftBill" },
      { name: "description", content: "Manage delivery zones and the cities that map to each zone for automatic zone detection." },
    ],
  }),
  component: ZonesPage,
});

const empty = { name: "", code: "", description: "" };

function ZonesPage() {
  const zones = useZones();
  const cities = useCities();
  const upsert = useUpsertZone();
  const del = useDeleteZone();
  const upsertCity = useUpsertCity();
  const delCity = useDeleteCity();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState(empty);

  const [cityName, setCityName] = useState("");
  const [cityZone, setCityZone] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const zoneName = (id: string) => zones.data?.find((z) => z.id === id)?.name ?? "—";

  const filteredCities = useMemo(() => {
    const all = cities.data ?? [];
    const q = cityFilter.trim().toLowerCase();
    return all
      .filter((c) => !q || c.name.toLowerCase().includes(q) || zoneName(c.zone_id).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [cities.data, cityFilter, zones.data]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (z: Zone) => {
    setEditing(z);
    setForm({ name: z.name, code: z.code, description: z.description ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) return toast.error("Name and code are required.");
    try {
      await upsert.mutateAsync({
        ...(editing ? { id: editing.id } : {}),
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim() || null,
      });
      toast.success(editing ? "Zone updated" : "Zone added");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const addCity = async () => {
    if (!cityName.trim()) return toast.error("Enter a city name.");
    if (!cityZone) return toast.error("Select a zone for the city.");
    try {
      await upsertCity.mutateAsync({ name: cityName.trim(), zone_id: cityZone });
      toast.success(`Added ${cityName.trim()}`);
      setCityName("");
    } catch (e) {
      toast.error((e as Error).message.includes("duplicate") ? "City already exists." : (e as Error).message);
    }
  };

  return (
    <AppLayout
      title="Zones & Cities"
      description="Cities map to zones so shipment zones are detected automatically from the receiver city."
      actions={
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Add zone
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="border-b px-5 py-3 font-semibold">Zones</div>
          {zones.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Cities</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.data.map((z) => (
                  <TableRow key={z.id}>
                    <TableCell className="font-medium">{z.name}</TableCell>
                    <TableCell className="font-mono text-sm">{z.code}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {(cities.data ?? []).filter((c) => c.zone_id === z.id).length}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(z)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(z.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No zones yet.</p>
            </div>
          )}
        </Card>

        <Card style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="border-b px-5 py-3 font-semibold">Cities</div>
          <div className="space-y-3 border-b p-4">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City name" value={cityName} onChange={(e) => setCityName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCity(); }} />
              <Select value={cityZone} onValueChange={setCityZone}>
                <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
                <SelectContent>
                  {zones.data?.map((z) => (
                    <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Search cities…" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
              <Button onClick={addCity} disabled={upsertCity.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Add city
              </Button>
            </div>
          </div>
          <div className="max-h-[50vh] overflow-auto">
            {filteredCities.length ? (
              <ul className="divide-y">
                {filteredCities.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-2.5">
                    <span className="font-medium">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{zoneName(c.zone_id)}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => delCity.mutate(c.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No cities. Any city not listed falls back to the ROI zone.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit zone" : "Add zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="zname">Zone name</Label>
              <Input id="zname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Metro" />
            </div>
            <div>
              <Label htmlFor="zcode">Code</Label>
              <Input id="zcode" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MET" className="font-mono" />
            </div>
            <div>
              <Label htmlFor="zdesc">Description</Label>
              <Input id="zdesc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Major metro cities" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
