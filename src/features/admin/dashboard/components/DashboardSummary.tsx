import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileClock,
  FileWarning,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminDashboardData } from "../dashboard.types";
import { formatDate } from "../dashboard.utils";

export function DashboardSummary({
  counts,
  generatedAt,
}: Pick<AdminDashboardData, "counts" | "generatedAt">) {
  return (
    <section aria-labelledby="summary-heading">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="civic-eyebrow mb-1">Live workload</p>
          <h2 id="summary-heading" className="text-xl font-bold tracking-tight">
            Request summary
          </h2>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">
          Updated {formatDate(generatedAt)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard label="Active" value={counts.active} icon={Clock3} href="/requests?status=active" />
        <SummaryCard label="Pending review" value={counts.pendingReview} icon={FileClock} href="/requests?status=pending_frontdesk" />
        <SummaryCard label="Incomplete" value={counts.incomplete} icon={FileWarning} href="/requests?status=incomplete" tone="danger" />
        <SummaryCard label="Pending approval" value={counts.pendingApproval} icon={BadgeCheck} href="/requests?status=pending_approval" />
        <SummaryCard label="Ready for release" value={counts.readyForRelease} icon={ClipboardCheck} href="/requests?status=ready_for_release" tone="success" />
        <SummaryCard label="Unpaid" value={counts.unpaid} icon={CircleDollarSign} href="/requests?paymentStatus=unpaid" tone="gold" />
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "primary",
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  tone?: "primary" | "danger" | "success" | "gold";
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-success-soft text-success",
    gold: "bg-warning-soft text-warning",
  };

  return (
    <a
      href={href}
      className="dashboard-stat group flex min-h-32 flex-col justify-between transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className={`flex size-9 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="size-[18px]" />
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <p className="text-3xl font-extrabold tabular-nums tracking-tight">
            {value.toLocaleString("en-PH")}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
            {label}
          </p>
        </div>
        <ArrowRight className="mb-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </a>
  );
}
