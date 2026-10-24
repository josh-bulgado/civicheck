import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, ClipboardCheck, ListChecks, ShieldCheck } from "lucide-react";
import type { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";

export interface CashierDashboardData {
  unpaid: number;
  paymentsVerifiedToday: number;
  scope: Awaited<ReturnType<typeof getMyDepartmentScopeFn>>;
}

export function CashierDashboard({ unpaid, paymentsVerifiedToday, scope }: CashierDashboardData) {
  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/90">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                CCRO operations
              </div>
              {scope.isScoped && scope.departmentName && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {scope.departmentName} department
                </div>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              Cashier Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              A focused workspace for looking up requests and collecting payment.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm">
            <ClipboardCheck className="size-5 text-brand-gold" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">{unpaid} awaiting payment</p>
              <p className="text-xs text-white/65">{paymentsVerifiedToday} verified today</p>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="staff-tools-heading">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Workflow modules
          </p>
          <h2
            id="staff-tools-heading"
            className="mt-1 text-xl font-bold tracking-tight text-foreground"
          >
            Your operational workspace
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ToolCard
            icon={ClipboardCheck}
            title="Cashier Counter"
            description="Look up a request by tracking number and record payment."
            count={unpaid}
            countLabel="awaiting payment"
            to="/cashier"
          />
          <ToolCard
            icon={ListChecks}
            title="Payments verified today"
            description="Payments you've collected and verified so far today."
            count={paymentsVerifiedToday}
            countLabel="verified today"
            to="/payment-history"
          />
        </div>
      </section>
    </div>
  );
}

function ToolCard({
  icon: Icon,
  title,
  description,
  count,
  countLabel,
  to,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  description: string;
  count: number;
  countLabel: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="dashboard-panel flex min-h-56 flex-col p-5 transition-colors hover:border-primary sm:p-6"
    >
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary-fill text-white shadow-sm">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-auto pt-5">
        <p className="text-3xl font-extrabold tracking-tight text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground">{countLabel}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-primary">
          Open
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
