import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteZone, useUpsertZone, useZones } from "@/lib/queries";
import type { Zone } from "@/lib/billing";

export const Route = createFileRoute("/zones")({
  head: () => ({
    meta: [
      { title: "Zones — SwiftBill" },
      { name: "description", content: "Manage delivery zones used for courier rate calculation." },
    ],
  }),
  component: ZonesPage,
});

const empty = { name: "", code: "", description: "" };

function ZonesPage() {
  const zones = useZones();
  const upsert = useUpsertZone();
  const del = useDeleteZone();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [form, setForm] = useState(empty);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (z: Zone) => {
    setEditing(z);
    setForm({ name: z.name, code: z.code, description: z.description ?? "" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required.");
      return;
    }
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

  return (
    <AppLayout
      title="Zones"
      description="Destination zones. The zone code should match what appears in courier reports."
      actions={
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Add zone
        </Button>
      }
    >
      <Card style={{ boxShadow: "var(--shadow-card)" }}>
        {zones.data?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.data.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium">{z.name}</TableCell>
                  <TableCell className="font-mono text-sm">{z.code}</TableCell>
                  <TableCell className="text-muted-foreground">{z.description ?? "—"}</TableCell>
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
            <Button onClick={openNew} variant="outline">
              <Plus className="mr-1 h-4 w-4" /> Add your first zone
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit zone" : "Add zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="zname">Zone name</Label>
              <Input
                id="zname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Metro"
              />
            </div>
            <div>
              <Label htmlFor="zcode">Code</Label>
              <Input
                id="zcode"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="METRO"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="zdesc">Description</Label>
              <Input
                id="zdesc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Major metro cities"
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