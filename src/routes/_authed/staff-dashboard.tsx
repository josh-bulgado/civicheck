import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { getAllRequestsFn, getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import { getTodayQueueFn } from "~/features/queue/queue.queries";
import { STAGE_OF, isRequestStatus } from "~/features/requests/request-workflow";

export const Route = createFileRoute("/_authed/staff-dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "dashboard:staff"))
      throw redirect({ to: "/dashboard" });
  },
  loader: async () => {
    const [requests, tickets, scope] = await Promise.all([
      getAllRequestsFn(),
      getTodayQueueFn(),
      getMyDepartmentScopeFn(),
    ]);

    const inStage = (stage: number) =>
      requests.filter((r) => isRequestStatus(r.status) && STAGE_OF[r.status] === stage)
        .length;

    return {
      awaitingIntake: inStage(1),
      inValidation: inStage(2),
      inProgress: inStage(3) + inStage(4),
      readyForRelease: requests.filter((r) => r.status === "ready_for_release").length,
      unpaid: requests.filter(
        (r) => r.status === "ready_for_release" && r.paymentStatus !== "verified",
      ).length,
      waitingInQueue: tickets.filter((t) => t.status === "waiting").length,
      servedToday: tickets.filter((t) => t.status === "served").length,
      scope,
    };
  },
  component: StaffDashboard,
});

function StaffDashboard() {
  const stats = Route.useLoaderData();

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
              Staff Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              A focused workspace for request intake, document validation, and civil
              registry processing.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur-sm">
            <Ticket className="size-5 text-brand-gold" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">{stats.waitingInQueue} waiting at the counter</p>
              <p className="text-xs text-white/65">{stats.servedToday} served today</p>
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
          <RequestQueueSummaryCard
            awaitingIntake={stats.awaitingIntake}
            inValidation={stats.inValidation}
            inProgress={stats.inProgress}
            readyForRelease={stats.readyForRelease}
            unpaid={stats.unpaid}
          />
          <ToolCard
            icon={Ticket}
            title="Queue desk"
            description="Issue numbers, encode walk-ins, and call the next applicant."
            count={stats.waitingInQueue}
            countLabel="waiting now"
            to="/queue"
          />
        </div>
      </section>
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
