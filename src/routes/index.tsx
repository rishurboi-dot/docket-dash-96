import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  Package,
  ReceiptText,
  ScanLine,
  Tags,
  TrendingUp,
  Upload,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/billing";
import {
  useBillingRecords,
  useCompanies,
  useDockets,
  useRateCards,
  useReportRows,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwiftBill — Courier Billing Dashboard" },
      {
        name: "description",
        content:
          "Scan dockets, upload courier reports, match shipments and generate accurate billing based on zone, weight, mode and company rate cards.",
      },
      { property: "og:title", content: "SwiftBill — Courier Billing" },
      {
        property: "og:description",
        content: "Automated courier billing from scanned dockets and courier Excel reports.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  { to: "/scan", icon: ScanLine, title: "Scan dockets", desc: "Capture docket barcodes with your handheld scanner." },
  { to: "/upload", icon: Upload, title: "Upload reports", desc: "Import the courier's Excel report file." },
  { to: "/billing", icon: ReceiptText, title: "Match & bill", desc: "Auto-match dockets and calculate charges." },
] as const;

function Index() {
  const dockets = useDockets();
  const reportRows = useReportRows();
  const billing = useBillingRecords();
  const companies = useCompanies();
  const rates = useRateCards();

  const totalBilled = (billing.data ?? []).reduce((s, b) => s + Number(b.charge), 0);

  return (
    <AppLayout
      title="Dashboard"
      description="Overview of your courier billing operations."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Scanned dockets" value={dockets.data?.length ?? 0} icon={ScanLine} />
        <StatCard label="Report rows" value={reportRows.data?.length ?? 0} icon={Package} />
        <StatCard label="Billed dockets" value={billing.data?.length ?? 0} icon={ReceiptText} />
        <StatCard
          label="Total billed"
          value={formatCurrency(totalBilled)}
          icon={TrendingUp}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Billing workflow</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Link key={step.to} to={step.to}>
                <Card
                  className="group h-full p-6 transition-all hover:-translate-y-0.5"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Setup</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {companies.data?.length ?? 0} companies and {rates.data?.length ?? 0} rate cards
            configured. Accurate billing needs a rate card per zone, mode and weight slab.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/companies"
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent/10"
            >
              <Building2 className="h-4 w-4" /> Companies
            </Link>
            <Link
              to="/rates"
              className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent/10"
            >
              <Tags className="h-4 w-4" /> Rate cards
            </Link>
          </div>
        </Card>
        <Card className="p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-3">
            <ReceiptText className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">How charges are calculated</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            For each matched docket we look up the company's rate card by destination zone,
            shipping mode and weight slab, then compute:
          </p>
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 font-mono text-sm">
            charge = base + per_kg × weight
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
