import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  ScanLine,
  FileSpreadsheet,
  Truck,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scan", label: "Scan Dockets", icon: ScanLine },
  { to: "/upload", label: "Upload Reports", icon: Upload },
  { to: "/billing", label: "Generate Billing", icon: ReceiptText },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/zones", label: "Zones & Cities", icon: MapPin },
  { to: "/quotations", label: "Quotations", icon: FileSpreadsheet },
] as const;

export function AppLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-bold">Prime Billing Software</p>
            <p className="text-xs text-sidebar-foreground/60">Courier Billing</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 text-xs text-sidebar-foreground/40">v1.0 · Lovable Cloud</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile nav */}
        <div className="flex gap-1 overflow-x-auto border-b bg-sidebar px-2 py-2 md:hidden">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <header className="border-b bg-card/60 px-6 py-5 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {actions}
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}