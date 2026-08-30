import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  ListChecks,
  PackageCheck,
  SearchCheck,
  Send,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import type { getMyRequestsFn } from "~/features/requests/applicant-requests.queries";
import {
  TERMINAL_STATUSES,
  getStatusDetails,
} from "~/features/requests/request-workflow";

type CitizenRequest = Awaited<ReturnType<typeof getMyRequestsFn>>[number];
type ActionTone = "warning" | "success";

interface AttentionItem {
  request: CitizenRequest;
  tone: ActionTone;
  icon: typeof AlertTriangle;
  message: string;
  action: string;
}

const TERMINAL_STATUS_SET = new Set<string>(TERMINAL_STATUSES);
const ACTIVE_PREVIEW_COUNT = 4;
const ATTENTION_PREVIEW_COUNT = 3;
const dateFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Manila",
});
const currencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function CitizenDashboard({
  requests,
  firstName,
}: {
  requests: Awaited<ReturnType<typeof getMyRequestsFn>>;
  firstName: string;
}) {
  const realtimeStatus = useRealtimeRefresh({
    tables: ["requests"],
    enabled: requests.length > 0,
  });

  const activeRequests = requests.filter(
    (request) => !TERMINAL_STATUS_SET.has(request.status ?? ""),
  );
  const incomplete = requests.filter(
    (request) => request.status === "incomplete",
  );
  const paymentDue = requests.filter(
    (request) =>
      request.status === "ready_for_release" &&
      request.payment_status !== "verified",
  );
  const readyToClaim = requests.filter(
    (request) =>
      request.status === "ready_for_release" &&
      request.payment_status === "verified",
  );
  const completedCount = requests.filter(
    (request) => request.status === "released",
  ).length;

  const attentionItems: AttentionItem[] = [
    ...incomplete.map((request) => ({
      request,
      tone: "warning" as const,
      icon: AlertTriangle,
      message: "Some requirements need to be corrected or submitted again.",
      action: "Review requirements",
    })),
    ...paymentDue.map((request) => ({
      request,
      tone: "warning" as const,
      icon: CreditCard,
      message: `${currencyFormatter.format(Number(request.fees_due ?? 0))} is due at the CCRO cashier before release.`,
      action: "See payment details",
    })),
    ...readyToClaim.map((request) => ({
      request,
      tone: "success" as const,
      icon: PackageCheck,
      message:
        "Payment is verified. Your document is ready to claim at the CCRO.",
      action: "View claim details",
    })),
  ];

  if (requests.length === 0) {
    return (
      <div className="dashboard-page max-w-7xl">
        <DashboardHero
          firstName={firstName}
          subhead="Start with the service you need. CiviCheck will show the requirements before you submit anything."
          hasRequests={false}
        />
        <GettingStarted />
      </div>
    );
  }

  return (
    <div className="dashboard-page max-w-7xl">
      <DashboardHero
        firstName={firstName}
        subhead={dashboardSubhead(attentionItems.length, activeRequests.length)}
        hasRequests
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.75fr)] lg:items-start">
        <AttentionPanel items={attentionItems} />
        <RequestPulse
          openCount={activeRequests.length}
          nextStepCount={attentionItems.length}
          completedCount={completedCount}
          realtimeStatus={realtimeStatus}
        />
      </div>

      <ActiveRequestsPanel requests={activeRequests} />
    </div>
  );
}

function DashboardHero({
  firstName,
  subhead,
  hasRequests,
}: {
  firstName: string;
  subhead: string;
  hasRequests: boolean;
}) {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            Citizen workspace
          </p>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            {hasRequests ? "Good to see you" : "Welcome to CiviCheck"}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/80">
            {subhead}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {hasRequests ? (
            <Link
              to="/my-requests"
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/60"
            >
              View all requests
            </Link>
          ) : null}
          <Link
            to="/services"
            className="civic-press inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/70"
          >
            Start a request
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function AttentionPanel({ items }: { items: AttentionItem[] }) {
  const visibleItems = items.slice(0, ATTENTION_PREVIEW_COUNT);

  return (
    <section
      className="dashboard-panel overflow-hidden"
      aria-labelledby="next-steps-title"
    >
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Next steps
        </p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="next-steps-title"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            {items.length > 0
              ? `${items.length} request${items.length === 1 ? "" : "s"} waiting on you`
              : "Nothing needs your attention"}
          </h2>
          {items.length > ATTENTION_PREVIEW_COUNT ? (
            <span className="text-xs font-semibold text-muted-foreground">
              Showing {ATTENTION_PREVIEW_COUNT} of {items.length}
            </span>
          ) : null}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex items-start gap-3 px-5 py-8 sm:px-6">
          <span className="status-success flex size-10 shrink-0 items-center justify-center rounded-full border">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-foreground">
              You’re all caught up.
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              We’ll place payment, document, or claim instructions here when
              action is needed.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visibleItems.map(
            ({ request, tone, icon: Icon, message, action }) => (
              <li key={request.id}>
                <Link
                  to="/my-requests/$requestId"
                  params={{ requestId: request.id }}
                  className="group flex min-h-24 items-start gap-3.5 px-5 py-4 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 sm:px-6"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${tone === "success" ? "status-success" : "status-warning"}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold leading-5 text-foreground">
                      {serviceName(request)}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs font-semibold text-muted-foreground">
                      {request.tracking_number}
                    </span>
                    <span className="mt-2 block text-sm leading-5 text-muted-foreground">
                      {message}
                    </span>
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary sm:hidden">
                      {action}
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="mt-1 hidden shrink-0 items-center gap-1 text-sm font-bold text-primary sm:inline-flex">
                    {action}
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ),
          )}
        </ul>
      )}

      {items.length > ATTENTION_PREVIEW_COUNT ? (
        <div className="border-t border-border px-5 py-3.5 sm:px-6">
          <Link
            to="/my-requests"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary"
          >
            View every next step
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function RequestPulse({
  openCount,
  nextStepCount,
  completedCount,
  realtimeStatus,
}: {
  openCount: number;
  nextStepCount: number;
  completedCount: number;
  realtimeStatus: "live" | "connecting" | "offline";
}) {
  const isLive = realtimeStatus === "live";

  return (
    <aside
      className="dashboard-panel overflow-hidden"
      aria-labelledby="request-pulse-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Request pulse
          </p>
          <h2
            id="request-pulse-title"
            className="mt-1 text-xl font-bold tracking-tight text-foreground"
          >
            At a glance
          </h2>
        </div>
        <span
          className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-surface-subtle px-2.5 text-xs font-semibold text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <span
            className={
              isLive
                ? "civic-live-dot"
                : "inline-flex size-2 rounded-full bg-muted-foreground/40"
            }
            aria-hidden="true"
          />
          {isLive
            ? "Live updates"
            : realtimeStatus === "connecting"
              ? "Connecting"
              : "Offline"}
        </span>
      </div>

      <dl className="grid grid-cols-3 divide-x divide-border px-2 py-5 text-center">
        <PulseFigure label="Open" value={openCount} />
        <PulseFigure label="Next steps" value={nextStepCount} />
        <PulseFigure label="Completed" value={completedCount} />
      </dl>
      <div className="border-t border-border bg-surface-subtle px-5 py-4 sm:px-6">
        <p className="text-sm leading-5 text-muted-foreground">
          Status changes appear here automatically while this page is open.
        </p>
      </div>
    </aside>
  );
}

function PulseFigure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col px-2">
      <dt className="order-2 mt-1 text-xs font-semibold leading-4 text-muted-foreground">
        {label}
      </dt>
      <dd className="order-1 text-2xl font-extrabold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function ActiveRequestsPanel({ requests }: { requests: CitizenRequest[] }) {
  return (
    <section
      className="dashboard-panel overflow-hidden"
      aria-labelledby="active-requests-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Your requests
          </p>
          <h2
            id="active-requests-title"
            className="mt-1 text-xl font-bold tracking-tight text-foreground"
          >
            {requests.length > 0 ? "Still in progress" : "No open requests"}
          </h2>
        </div>
        <Link
          to="/my-requests"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary"
        >
          Request history
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="px-5 py-10 text-center sm:px-6">
          <FileCheck2
            className="mx-auto size-7 text-success"
            aria-hidden="true"
          />
          <p className="mt-3 font-semibold text-foreground">
            Every request is resolved.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Released and rejected requests remain available in your history.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {requests.slice(0, ACTIVE_PREVIEW_COUNT).map((request) => {
            const status = getStatusDetails(request.status);

            return (
              <li key={request.id}>
                <Link
                  to="/my-requests/$requestId"
                  params={{ requestId: request.id }}
                  className="group grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:px-6"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold leading-5 text-foreground">
                      {serviceName(request)}
                    </span>
                    <span className="mt-1 block font-mono text-xs font-semibold text-muted-foreground">
                      {request.tracking_number}
                    </span>
                  </span>
                  <Badge variant={status.variant} className="justify-self-end">
                    {status.label}
                  </Badge>
                  <span className="col-span-2 text-xs font-medium text-muted-foreground sm:col-span-1 sm:text-sm">
                    Submitted{" "}
                    {dateFormatter.format(new Date(request.created_at))}
                  </span>
                  <ChevronRight
                    className="hidden size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {requests.length > ACTIVE_PREVIEW_COUNT ? (
        <div className="border-t border-border bg-surface-subtle px-5 py-3 text-center sm:px-6">
          <Link
            to="/my-requests"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary"
          >
            View all {requests.length} open requests
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function GettingStarted() {
  const steps = [
    {
      icon: SearchCheck,
      title: "Choose a service",
      description:
        "Compare available civil registry services and review the checklist.",
    },
    {
      icon: Send,
      title: "Prepare and submit",
      description:
        "Complete the form and attach each required supporting document.",
    },
    {
      icon: ClipboardCheck,
      title: "Track and claim",
      description:
        "Follow status updates, payment instructions, and release details here.",
    },
  ] as const;

  return (
    <section
      className="dashboard-panel overflow-hidden"
      aria-labelledby="getting-started-title"
    >
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Your first request
        </p>
        <h2
          id="getting-started-title"
          className="mt-1 text-xl font-bold tracking-tight text-foreground"
        >
          From requirements to release
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          You can check what you need before beginning, so there are no
          surprises halfway through.
        </p>
      </div>

      <ol className="grid divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {steps.map(({ icon: Icon, title, description }, index) => (
          <li key={title} className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span
                className="font-mono text-xs font-bold text-muted-foreground"
                aria-hidden="true"
              >
                0{index + 1}
              </span>
            </div>
            <h3 className="mt-4 font-bold text-foreground">{title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 border-t border-border bg-surface-subtle px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          Requirements are shown before the application form.
        </span>
        <Link
          to="/services"
          className={buttonVariants({ size: "lg", className: "min-h-11 px-4" })}
        >
          Browse services
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function dashboardSubhead(attentionCount: number, activeCount: number) {
  if (attentionCount > 0) {
    return `${attentionCount} next step${attentionCount === 1 ? " is" : "s are"} waiting. Take care of ${attentionCount === 1 ? "it" : "them"} to keep your request${activeCount === 1 ? "" : "s"} moving.`;
  }
  if (activeCount > 0) {
    return `${activeCount} request${activeCount === 1 ? " is" : "s are"} moving through the CCRO. We’ll update this page when the status changes.`;
  }
  return "Your current requests are resolved. You can review their history or start another service when needed.";
}

function serviceName(request: CitizenRequest) {
  const service = Array.isArray(request.services_registry)
    ? request.services_registry[0]
    : request.services_registry;

  return service?.name || request.request_type;
}
