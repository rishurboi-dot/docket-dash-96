import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Package,
  ReceiptText,
  Scale,
  ScanLine,
  TrendingUp,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/billing";
import {
  useBillingRecords,
  useCompanies,
  useDockets,
  useZones,
} from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwiftBill — Courier Billing Dashboard" },
      {
        name: "description",
        content:
          "Scan dockets, upload courier reports, match shipments and generate accurate billing based on zone, weight, mode and company quotations.",
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
  { to: "/upload", icon: Upload, title: "Upload report", desc: "Import the courier's Excel/CSV report." },
  { to: "/billing", icon: ReceiptText, title: "Generate billing", desc: "Pick a company — amounts are computed automatically." },
] as const;

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Index() {
  const dockets = useDockets();
  const billing = useBillingRecords();
  const companies = useCompanies();
  const zones = useZones();

  const records = billing.data ?? [];
  const now = new Date();
  const isToday = (d: string) => new Date(d).toDateString() === now.toDateString();
  const isThisMonth = (d: string) => {
    const x = new Date(d);
    return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
  };

  const todayRecords = records.filter((r) => isToday(r.created_at));
  const shipmentsToday = todayRecords.length;
  const weightToday = todayRecords.reduce((s, r) => s + Number(r.weight ?? 0), 0);
  const billingToday = todayRecords.reduce((s, r) => s + Number(r.charge), 0);
  const pending = (dockets.data ?? []).filter((d) => d.status === "pending").length;
  const monthlyRevenue = records.filter((r) => isThisMonth(r.created_at)).reduce((s, r) => s + Number(r.charge), 0);

  const zoneName = (id: string | null) => zones.data?.find((z) => z.id === id)?.name ?? "Unzoned";
  const companyName = (id: string | null) => companies.data?.find((c) => c.id === id)?.name ?? "—";

  const shipmentsByZone = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) m.set(zoneName(r.zone_id), (m.get(zoneName(r.zone_id)) ?? 0) + 1);
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [records, zones.data]);

  const revenueByCompany = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) m.set(companyName(r.company_id), (m.get(companyName(r.company_id)) ?? 0) + Number(r.charge));
    return [...m.entries()].map(([name, revenue]) => ({ name, revenue }));
  }, [records, companies.data]);

  const monthlyTrend = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of records) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m.set(key, (m.get(key) ?? 0) + Number(r.charge));
    }
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, revenue]) => ({ month, revenue }));
  }, [records]);

  return (
    <AppLayout title="Dashboard" description="Overview of your courier billing operations.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Shipments Today" value={shipmentsToday} icon={Package} />
        <StatCard label="Weight Today" value={`${weightToday.toFixed(1)} kg`} icon={Scale} />
        <StatCard label="Billing Today" value={formatCurrency(billingToday)} icon={ReceiptText} />
        <StatCard label="Pending Shipments" value={pending} icon={ScanLine} />
        <StatCard label="Companies" value={companies.data?.length ?? 0} icon={Building2} />
        <StatCard label="Monthly Revenue" value={formatCurrency(monthlyRevenue)} icon={CalendarClock} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="mb-4 font-semibold">Shipments by Zone</h3>
          {shipmentsByZone.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={shipmentsByZone} dataKey="value" nameKey="name" outerRadius={90} label>
                  {shipmentsByZone.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>

        <Card className="p-5 lg:col-span-2" style={{ boxShadow: "var(--shadow-card)" }}>
          <h3 className="mb-4 font-semibold">Revenue by Company</h3>
          {revenueByCompany.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueByCompany}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="mb-4 font-semibold">Monthly Revenue Trend</h3>
        {monthlyTrend.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="var(--chart-2)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart />
        )}
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Billing workflow</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Link key={step.to} to={step.to}>
                <Card className="group h-full p-6 transition-all hover:-translate-y-0.5" style={{ boxShadow: "var(--shadow-card)" }}>
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
    </AppLayout>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <TrendingUp className="h-6 w-6 opacity-50" />
        Generate billing to see analytics.
      </div>
    </div>
  );
}
