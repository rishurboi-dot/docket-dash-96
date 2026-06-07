import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileSpreadsheet, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseCourierExcel } from "@/lib/excel";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteReport, useReports } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Courier Reports — SwiftBill" },
      { name: "description", content: "Import courier Excel reports for docket matching and billing." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reports = useReports();
  const deleteReport = useDeleteReport();
  const qc = useQueryClient();

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const rows = await parseCourierExcel(file);
      if (!rows.length) {
        toast.error("No docket rows found in this file.");
        return;
      }
      const { data: report, error } = await supabase
        .from("courier_reports")
        .insert({ name: file.name, row_count: rows.length })
        .select()
        .single();
      if (error) throw error;

      const payload = rows.map((r) => ({
        ...r,
        report_id: report.id,
        raw: r.raw as Json,
      }));
      // insert in chunks to stay within limits
      for (let i = 0; i < payload.length; i += 500) {
        const chunk = payload.slice(i, i + 500);
        const { error: rowErr } = await supabase.from("courier_report_rows").insert(chunk);
        if (rowErr) throw rowErr;
      }
      toast.success(`Imported ${rows.length} rows from ${file.name}`);
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["report_rows"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <AppLayout
      title="Upload Courier Reports"
      description="Import the courier's Excel report. Columns are auto-detected (docket no., weight, zone, mode, destination)."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          className="flex flex-col items-center justify-center border-2 border-dashed p-10 text-center lg:col-span-1"
          style={{ boxShadow: "var(--shadow-card)" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud className="h-7 w-7" />
          </div>
          <p className="mt-4 font-medium">Drop an Excel file here</p>
          <p className="mt-1 text-sm text-muted-foreground">.xlsx, .xls or .csv</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            className="mt-4"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "Importing…" : "Choose file"}
          </Button>
        </Card>

        <Card className="lg:col-span-2" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-semibold">Uploaded reports</h3>
            <Badge variant="secondary">{reports.data?.length ?? 0}</Badge>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {reports.data?.length ? (
              <ul className="divide-y">
                {reports.data.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.row_count} rows · {new Date(r.uploaded_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteReport.mutate(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-16 text-center text-sm text-muted-foreground">
                No reports uploaded yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}