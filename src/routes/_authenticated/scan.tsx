import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ScanLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddDocket, useCompanies, useDeleteDocket, useDockets } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scan Dockets — SwiftBill" },
      { name: "description", content: "Scan docket barcodes with a handheld scanner to log shipments." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const [value, setValue] = useState("");
  const [companyId, setCompanyId] = useState<string>("none");
  const inputRef = useRef<HTMLInputElement>(null);
  const companies = useCompanies();
  const dockets = useDockets();
  const addDocket = useAddDocket();
  const deleteDocket = useDeleteDocket();

  const submit = async (raw: string) => {
    const docket_number = raw.trim();
    if (!docket_number) return;
    setValue("");
    inputRef.current?.focus();
    if ((dockets.data ?? []).some((d) => d.docket_number === docket_number)) {
      toast.warning(`Already scanned: ${docket_number}`);
      return;
    }
    try {
      await addDocket.mutateAsync({
        docket_number,
        company_id: companyId === "none" ? null : companyId,
      });
      toast.success(`Scanned ${docket_number}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const companyName = (id: string | null) =>
    companies.data?.find((c) => c.id === id)?.name ?? "—";

  return (
    <AppLayout
      title="Scan Dockets"
      description="Point your handheld scanner here — each scan is logged automatically."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1" style={{ boxShadow: "var(--shadow-card)" }}>
          <label className="mb-2 block text-sm font-medium">Assign to company</label>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Optional company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No company</SelectItem>
              {companies.data?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form
            className="mt-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit(value);
            }}
          >
            <label className="mb-2 block text-sm font-medium">Docket barcode</label>
            <div className="relative">
              <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Scan or type, then Enter"
                className="pl-10 font-mono"
              />
            </div>
            <Button type="submit" className="mt-3 w-full" disabled={addDocket.isPending}>
              Add docket
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Most USB scanners send an Enter keystroke after each code, so codes log
            hands-free. Keep this field focused.
          </p>
        </Card>

        <Card className="lg:col-span-2" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-semibold">Scanned dockets</h3>
            <Badge variant="secondary">{dockets.data?.length ?? 0} total</Badge>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {dockets.data?.length ? (
              <ul className="divide-y">
                {dockets.data.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium">{d.docket_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {companyName(d.company_id)} ·{" "}
                        {new Date(d.scanned_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={d.status === "billed" ? "default" : "outline"}
                        className="capitalize"
                      >
                        {d.status}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteDocket.mutate(d.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                No dockets scanned yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}