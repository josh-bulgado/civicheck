import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  ArrowRight,
  ClipboardCheck,
  FileClock,
  LayoutDashboard,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { getAllRequestsFn } from "~/features/requests/requests.queries";
import { getTodayQueueFn } from "~/features/queue/queue.queries";
import { STAGE_OF, isRequestStatus } from "~/features/requests/request-workflow";

export const Route = createFileRoute("/_authed/staff-dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "dashboard:staff"))
      throw redirect({ to: "/dashboard" });
  },
  loader: async () => {
    const [requests, tickets] = await Promise.all([getAllRequestsFn(), getTodayQueueFn()]);

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
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white/90">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              CCRO operations
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
        <div className="grid gap-4 md:grid-cols-3">
          <ToolCard
            icon={FileClock}
            title="Request queue"
            description="Newly submitted requests awaiting a front-desk check."
            count={stats.awaitingIntake}
            countLabel="awaiting intake"
            to="/requests"
          />
          <ToolCard
            icon={ClipboardCheck}
            title="Validation"
            description="Requests whose requirements are being verified."
            count={stats.inValidation}
            countLabel="in validation"
            to="/requests"
          />
          <ToolCard
            icon={LayoutDashboard}
            title="Processing & release"
            description="Being prepared, approved, or waiting to be claimed."
            count={stats.inProgress + stats.readyForRelease}
            countLabel={`${stats.readyForRelease} ready · ${stats.unpaid} unpaid`}
            to="/requests"
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
