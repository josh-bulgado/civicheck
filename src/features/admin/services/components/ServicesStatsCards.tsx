import { useMemo } from "react";
import { FileCheck2, FileClock, Files, Settings } from "lucide-react";
import { Service } from "../services.types";

interface ServicesStatsCardsProps {
  data: Service[];
}

export function ServicesStatsCards({ data }: ServicesStatsCardsProps) {
  const stats = useMemo(
    () => ({
      total: data.length,
      simple: data.filter((s) => s.classification === "simple").length,
      complex: data.filter((s) => s.classification === "complex").length,
      highlyTechnical: data.filter(
        (s) => s.classification === "highly_technical",
      ).length,
    }),
    [data],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Files} label="Registered services" value={stats.total} detail="Official CCRO service entries" accent="bg-primary" />
      <StatCard icon={FileCheck2} label="Simple" value={stats.simple} detail="Standard processing workflow" accent="bg-success" />
      <StatCard icon={FileClock} label="Complex" value={stats.complex} detail="Extended verification required" accent="bg-brand-gold" />
      <StatCard icon={Settings} label="Highly technical" value={stats.highlyTechnical} detail="Specialized review workflow" accent="bg-destructive" />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: typeof Files;
  label: string;
  value: number;
  detail: string;
  accent: string;
}) {
  return (
    <article className="dashboard-stat">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-subtle p-2.5 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}
