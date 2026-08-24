import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Baby,
  CheckCircle,
  Clock3,
  CreditCard,
  FileText,
  Gem,
  Heart,
  ScrollText,
} from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import {
  TERMINAL_STATUSES,
  getStatusDetails,
} from "~/features/requests/request-workflow";

const QUICK_SERVICES = [
  { icon: Baby, label: "Birth Certificate" },
  { icon: Gem, label: "Marriage Certificate" },
  { icon: Heart, label: "Death Certificate" },
  { icon: ScrollText, label: "Certified True Copy" },
] as const;

const ACTIVE_PREVIEW_COUNT = 5;

export function CitizenDashboard({
  requests,
  firstName,
}: {
  requests: any[];
  firstName: string;
}) {
  const realtimeStatus = useRealtimeRefresh({ tables: ["requests"] });

  const activeRequests = requests.filter(
    (request) => !(TERMINAL_STATUSES as string[]).includes(request.status),
  );
  const readyForRelease = requests.filter((r) => r.status === "ready_for_release");
  const paymentDue = requests.filter(
    (r) => r.status === "ready_for_release" && r.payment_status !== "verified",
  );
  const incomplete = requests.filter((r) => r.status === "incomplete");

  const attentionItems = [
    ...incomplete.map((request) => ({
      request,
      tone: "warning" as const,
      message: "Missing requirements — resubmit so validation can continue.",
      action: "Upload docs",
    })),
    ...paymentDue.map((request) => ({
      request,
      tone: "success" as const,
      message: `₱${Number(request.fees_due ?? 0).toFixed(2)} due — pay and claim at the CCRO cashier.`,
      action: "View details",
    })),
  ];

  if (requests.length === 0) {
    return (
      <div className="dashboard-page max-w-7xl">
        <DashboardHero
          firstName={firstName}
          greeting="Welcome"
          subhead="Let's find out what you need. Pick a document below to see its checklist, then submit your request when you're ready."
        />
        <QuickStartPanel prominent />
      </div>
    );
  }

  return (
    <div className="dashboard-page max-w-7xl">
      <DashboardHero
        firstName={firstName}
        greeting="Welcome back"
        subhead={attentionSubhead(readyForRelease.length, incomplete.length)}
      />

      <div className="civic-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          index={0}
          icon={FileText}
          label="All requests"
          value={requests.length}
          accent="bg-primary"
        />
        <StatTile
          index={1}
          icon={Clock3}
          label="In progress"
          value={activeRequests.length}
          accent="bg-primary"
        />
        <StatTile
          index={2}
          icon={CheckCircle}
          label="Ready for release"
          value={readyForRelease.length}
          accent="bg-success"
        />
        <StatTile
          index={3}
          icon={CreditCard}
          label="Payment due"
          value={paymentDue.length}
          accent="bg-brand-gold"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="dashboard-panel overflow-hidden">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Needs your attention
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              {attentionItems.length > 0
                ? `${attentionItems.length} request${attentionItems.length === 1 ? "" : "s"} need action`
                : "You're all caught up"}
            </h2>
          </div>
          {attentionItems.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
              Nothing needs your input right now — we'll notify you when something
              changes.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {attentionItems.map(({ request, tone, message, action }) => (
                <li
                  key={request.id}
                  className="flex items-start gap-3.5 px-5 py-4 sm:px-6"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${tone === "warning" ? "status-warning" : "status-success"}`}
                  >
                    {tone === "warning" ? (
                      <AlertTriangle className="size-4.5" aria-hidden="true" />
                    ) : (
                      <CheckCircle className="size-4.5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">
                      {request.tracking_number} ·{" "}
                      {request.services_registry?.name || request.request_type}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                      {message}
                    </p>
                  </div>
                  <Link
                    to="/my-requests/$requestId"
                    params={{ requestId: request.id }}
                    className="civic-nudge shrink-0 whitespace-nowrap pt-0.5 text-[13px] font-bold text-primary"
                  >
                    {action} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <QuickStartPanel />
      </div>

      <div className="dashboard-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              Active requests
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              In progress right now
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span
                className={
                  realtimeStatus === "live"
                    ? "civic-live-dot"
                    : "inline-flex size-2 rounded-full bg-muted-foreground/40"
                }
              />
              {realtimeStatus === "live"
                ? "Live"
                : realtimeStatus === "connecting"
                  ? "Connecting"
                  : "Offline"}
            </span>
            <Link to="/my-requests" className="text-[13px] font-bold text-primary">
              View all →
            </Link>
          </div>
        </div>

        {activeRequests.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
            Nothing in progress — everything you've submitted has been released or
            resolved.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-subtle">
                    <TableHead className="p-4">Tracking Number</TableHead>
                    <TableHead className="p-4">Document Type</TableHead>
                    <TableHead className="p-4">Status</TableHead>
                    <TableHead className="p-4">Submitted</TableHead>
                    <TableHead className="p-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="civic-stagger">
                  {activeRequests.slice(0, ACTIVE_PREVIEW_COUNT).map((request, index) => {
                    const status = getStatusDetails(request.status);
                    return (
                      <TableRow
                        key={request.id}
                        style={staggerStyle(index)}
                        className="transition-colors duration-200 hover:bg-surface-subtle"
                      >
                        <TableCell className="p-4 font-mono font-semibold text-foreground">
                          {request.tracking_number}
                        </TableCell>
                        <TableCell className="p-4 font-medium text-foreground">
                          {request.services_registry?.name || request.request_type}
                        </TableCell>
                        <TableCell className="p-4">
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-4 text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="p-4 text-right">
                          <Link
                            to="/my-requests/$requestId"
                            params={{ requestId: request.id }}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Details
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="civic-stagger divide-y divide-border md:hidden">
              {activeRequests.slice(0, ACTIVE_PREVIEW_COUNT).map((request, index) => {
                const status = getStatusDetails(request.status);
                return (
                  <Link
                    key={request.id}
                    to="/my-requests/$requestId"
                    params={{ requestId: request.id }}
                    style={staggerStyle(index)}
                    className="flex items-center justify-between gap-3 p-4 transition-colors duration-200 hover:bg-surface-subtle"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-bold text-foreground">
                        {request.tracking_number}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {request.services_registry?.name || request.request_type}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-2xs font-medium ${status.styles}`}
                    >
                      {status.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {activeRequests.length > ACTIVE_PREVIEW_COUNT && (
              <div className="border-t border-border px-5 py-3.5 text-center sm:px-6">
                <Link to="/my-requests" className="text-[13px] font-bold text-primary">
                  View all {activeRequests.length} active requests →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function attentionSubhead(readyCount: number, incompleteCount: number) {
  if (readyCount > 0 && incompleteCount > 0) {
    return `You have ${readyCount} request${readyCount === 1 ? "" : "s"} ready for release and ${incompleteCount} that need${incompleteCount === 1 ? "s" : ""} your attention before ${incompleteCount === 1 ? "it" : "they"} can move forward.`;
  }
  if (readyCount > 0) {
    return `You have ${readyCount} request${readyCount === 1 ? "" : "s"} ready for release — pay and claim ${readyCount === 1 ? "it" : "them"} at the CCRO cashier.`;
  }
  if (incompleteCount > 0) {
    return `${incompleteCount} request${incompleteCount === 1 ? "" : "s"} need${incompleteCount === 1 ? "s" : ""} your attention before ${incompleteCount === 1 ? "it can" : "they can"} move forward.`;
  }
  return "Track the status of your submitted civil registry requests in real time.";
}

function DashboardHero({
  firstName,
  greeting,
  subhead,
}: {
  firstName: string;
  greeting: string;
  subhead: string;
}) {
  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            Applicant workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">{subhead}</p>
        </div>
        <Link
          to="/services"
          className="civic-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm hover:bg-primary-soft"
        >
          Check Requirements
        </Link>
      </div>
    </header>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
  index,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  accent: string;
  index: number;
}) {
  return (
    <article
      className="dashboard-stat civic-interactive civic-lift"
      style={staggerStyle(index)}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <CountUp value={value} className="mt-2 block text-3xl font-extrabold text-foreground" />
        </div>
        <div className="rounded-lg border border-border bg-surface-subtle p-2.5 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

function QuickStartPanel({ prominent = false }: { prominent?: boolean }) {
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
