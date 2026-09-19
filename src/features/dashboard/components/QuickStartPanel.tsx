import { Link } from "@tanstack/react-router";
import { Baby, Gem, Heart, ScrollText } from "lucide-react";

const QUICK_SERVICES = [
  { icon: Baby, label: "Birth Certificate" },
  { icon: Gem, label: "Marriage Certificate" },
  { icon: Heart, label: "Death Certificate" },
  { icon: ScrollText, label: "Certified True Copy" },
] as const;

interface QuickStartPanelProps {
  prominent?: boolean;
}

export function QuickStartPanel({ prominent = false }: QuickStartPanelProps) {
  return (
    <div className="dashboard-panel flex flex-col">
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Quick start
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          {prominent ? "What are you here for?" : "Start a new request"}
        </h2>
      </div>
      <div
        className={`grid gap-2.5 p-5 sm:p-6 ${prominent ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}
      >
        {QUICK_SERVICES.map(({ icon: Icon, label }) => (
          <Link
            key={label}
            to="/services"
            className="civic-interactive civic-lift flex items-center gap-3 rounded-lg border border-border p-3 hover:border-primary/30 hover:shadow-[0_8px_20px_-8px_rgba(11,77,162,0.28)]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-bold text-foreground">{label}</span>
          </Link>
        ))}
      </div>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <Link to="/services" className="text-[13px] font-bold text-primary">
          View all services →
        </Link>
      </div>
    </div>
  );
}
