import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import {
  getAllRequestsFn,
  getAwaitingPaymentCountFn,
  getMyDepartmentScopeFn,
  getPaymentsVerifiedTodayCountFn,
  type StaffRequestRow,
} from "~/features/requests/requests.queries";
import { STAGE_OF, isRequestStatus } from "~/features/requests/request-workflow";
import { getStatusDetails } from "~/features/services/request-status";
import { WalkInIntakeDialog } from "~/features/requests/components/WalkInIntakeDialog";
import { getEncodableServicesFn } from "~/features/requests/walk-in-intake.queries";

export const Route = createFileRoute("/_authed/staff-dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "dashboard:staff"))
      throw redirect({ to: "/dashboard" });
  },
  loader: async ({ context }) => {
    const isCashier = context.user?.role === "cashier";

    // Cashier holds no request-docket permissions — it must
    // never call those functions, only the narrow counts
    // its own Cashier Counter / Payment History actually need.
    if (isCashier) {
      const [scope, unpaid, paymentsVerifiedToday] = await Promise.all([
        getMyDepartmentScopeFn(),
        getAwaitingPaymentCountFn(),
        getPaymentsVerifiedTodayCountFn(),
      ]);

      return {
        isCashier: true as const,
        canViewRequests: false,
        canEncodeWalkIn: false,
        awaitingIntake: 0,
        inValidation: 0,
        inProgress: 0,
        readyForRelease: 0,
        unpaid,
        paymentsVerifiedToday,
        scope,
        needsAttention: [] as StaffRequestRow[],
        needsAttentionCount: 0,
        encodableServices: [],
      };
    }

    const role = context.user!.role as Role;
    const canViewRequests = hasPermission(role, "requests:view_all");
    const canEncodeWalkIn = hasPermission(role, "requests:encode_walkin");
    const [requests, scope, encodableServices] = await Promise.all([
      canViewRequests ? getAllRequestsFn() : Promise.resolve([]),
      getMyDepartmentScopeFn(),
      canEncodeWalkIn ? getEncodableServicesFn() : Promise.resolve([]),
    ]);

    const inStage = (stage: number) =>
      requests.filter((r) => isRequestStatus(r.status) && STAGE_OF[r.status] === stage)
        .length;

    const needsAttentionAll = requests
      .filter((r) => r.status === "incomplete" || r.status === "rejected")
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

    return {
      isCashier: false as const,
      canViewRequests,
      canEncodeWalkIn,
      awaitingIntake: inStage(1),
      inValidation: inStage(2),
      inProgress: inStage(3) + inStage(4),
      readyForRelease: requests.filter((r) => r.status === "ready_for_release").length,
      unpaid: requests.filter(
        (r) => r.status === "ready_for_release" && r.paymentStatus !== "verified",
      ).length,
      paymentsVerifiedToday: 0,
      scope,
      needsAttention: needsAttentionAll.slice(0, 5),
      needsAttentionCount: needsAttentionAll.length,
      encodableServices,
    };
  },
  component: StaffDashboard,
});

function StaffDashboard() {
  const stats = Route.useLoaderData();
  const router = useRouter();

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
              {stats.scope.isScoped && stats.scope.departmentName && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  {stats.scope.departmentName} department
                </div>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              {stats.isCashier ? "Cashier Dashboard" : "Staff Dashboard"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              {stats.isCashier
                ? "A focused workspace for looking up requests and collecting payment."
                : "A focused workspace for request intake, document validation, and civil registry processing."}
            </p>
            {!stats.isCashier && stats.canEncodeWalkIn && (
              <div className="mt-4">
                <WalkInIntakeDialog
                  services={stats.encodableServices}
                  onChanged={() => router.invalidate()}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm">
            <ClipboardCheck className="size-5 text-brand-gold" aria-hidden="true" />
            {stats.isCashier ? (
              <div>
                <p className="text-sm font-bold">{stats.unpaid} awaiting payment</p>
                <p className="text-xs text-white/65">{stats.paymentsVerifiedToday} verified today</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold">{stats.awaitingIntake} awaiting intake</p>
                <p className="text-xs text-white/65">{stats.readyForRelease} ready for release</p>
              </div>
            )}
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
        {stats.isCashier ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ToolCard
              icon={ClipboardCheck}
              title="Cashier Counter"
              description="Look up a request by tracking number and record payment."
              count={stats.unpaid}
              countLabel="awaiting payment"
              to="/cashier"
            />
            <ToolCard
              icon={ListChecks}
              title="Payments verified today"
              description="Payments you've collected and verified so far today."
              count={stats.paymentsVerifiedToday}
              countLabel="verified today"
              to="/payment-history"
            />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stats.canViewRequests ? (
              <>
                <RequestQueueSummaryCard
                  awaitingIntake={stats.awaitingIntake}
                  inValidation={stats.inValidation}
                  inProgress={stats.inProgress}
                  readyForRelease={stats.readyForRelease}
                  unpaid={stats.unpaid}
                />
                <NeedsAttentionCard
                  requests={stats.needsAttention}
                  total={stats.needsAttentionCount}
                />
              </>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function NeedsAttentionCard({
  requests,
  total,
}: {
  requests: StaffRequestRow[];
  total: number;
}) {
  return (
    <div className="dashboard-panel flex min-h-56 flex-col p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-warning text-white shadow-sm">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Needs attention</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Incomplete or rejected requests waiting the longest.
          </p>
        </div>
        <span className="ml-auto shrink-0 text-sm font-bold tabular-nums text-foreground">
          {total}
        </span>
      </div>

      {requests.length === 0 ? (
        <p className="mt-5 flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Nothing needs attention right now.
        </p>
      ) : (
        <ul className="mt-5 flex flex-1 flex-col divide-y divide-border border-t border-border">
          {requests.map((request) => {
            const status = getStatusDetails(request.status);
            return (
              <li key={request.id}>
                <Link
                  to="/requests/$requestId"
                  params={{ requestId: request.id }}
                  className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {request.trackingNumber} · {request.applicantName}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${status.styles}`}
                  >
                    {status.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RequestQueueSummaryCard({
  awaitingIntake,
  inValidation,
  inProgress,
  readyForRelease,
  unpaid,
}: {
  awaitingIntake: number;
  inValidation: number;
  inProgress: number;
  readyForRelease: number;
  unpaid: number;
}) {
  return (
    <div className="dashboard-panel flex min-h-56 flex-col p-5 sm:p-6">
      <Link to="/requests" className="group flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
          <ListChecks className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground group-hover:text-primary">
            Request Queue
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Every request in your queue, by stage.
          </p>
        </div>
        <ArrowRight
          className="ml-auto size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </Link>

      <div className="mt-5 flex flex-1 flex-col divide-y divide-border border-t border-border">
        <StageRow
          icon={FileClock}
          label="Awaiting intake"
          count={awaitingIntake}
          search={{ stage: 1 }}
        />
        <StageRow
          icon={ClipboardCheck}
          label="In validation"
          count={inValidation}
          search={{ stage: 2 }}
        />
        <StageRow
          icon={LayoutDashboard}
          label="Processing & release"
          count={inProgress + readyForRelease}
          note={`${readyForRelease} ready · ${unpaid} unpaid`}
        />
      </div>
    </div>
  );
}

function StageRow({
  icon: Icon,
  label,
  count,
  note,
  search,
}: {
  icon: typeof FileClock;
  label: string;
  count: number;
  note?: string;
  search?: { stage: 1 | 2 | 3 | 4 | 5 };
}) {
  return (
    <Link
      to="/requests"
      search={search}
      className="flex items-center gap-3 py-3 transition-colors hover:text-primary"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
      <span className="text-sm font-bold tabular-nums text-foreground">{count}</span>
    </Link>
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
  icon: typeof FileClock;
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
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
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
