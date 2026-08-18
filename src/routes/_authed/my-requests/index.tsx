import { createFileRoute, Link } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  FileText,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock3,
  CreditCard,
} from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { getStatusDetails, getPaymentDetails } from "~/features/services/request-status";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getMyRequestsFn } from "~/features/requests/applicant-requests.queries";

export const Route = createFileRoute("/_authed/my-requests/")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own")) throw new Error("Forbidden");
  },
  loader: () => getMyRequestsFn(),
  component: MyRequestsPage,
});

function MyRequestsPage() {
  const requests = Route.useLoaderData();
  // The applicant's own status tracker — this is the "no polling-by-phone-call"
  // promise, so it has to move the moment staff advance the request.
  useRealtimeRefresh({ tables: ["requests"] });
  const activeCount = requests.filter(
    (request: any) => !["released", "rejected"].includes(request.status ?? ""),
  ).length;
  const readyCount = requests.filter(
    (request: any) => request.status === "ready_for_release",
  ).length;
  const unpaidCount = requests.filter(
    (request: any) => request.payment_status === "unpaid",
  ).length;

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">Applicant workspace</p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">My Requests</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Track the status of your submitted civil registry requests in real time.
          </p>
        </div>
        <Link
          to="/services"
          className="civic-press inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm hover:bg-primary-soft"
        >
          Submit New Request
        </Link>
        </div>
      </header>

      {requests.length > 0 ? (
        <div className="civic-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RequestStat index={0} icon={FileText} label="All requests" value={requests.length} accent="bg-primary" />
          <RequestStat index={1} icon={Clock3} label="In progress" value={activeCount} accent="bg-primary" />
          <RequestStat index={2} icon={CheckCircle} label="Ready for release" value={readyCount} accent="bg-success" />
          <RequestStat index={3} icon={CreditCard} label="Payment due" value={unpaidCount} accent="bg-brand-gold" />
        </div>
      ) : null}

      {requests.length === 0 ? (
        <div className="dashboard-panel civic-enter-scale mx-auto mt-8 max-w-lg space-y-4 px-6 py-16 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-xl bg-primary text-white shadow-md">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-foreground">No requests found</h3>
            <p className="text-sm text-muted-foreground">
              You haven't submitted any civil registry requests yet.
            </p>
          </div>
          <Link
            to="/services"
            className="inline-flex min-h-10 items-center rounded-lg border border-border bg-white px-3.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Browse Services
          </Link>
        </div>
      ) : (
        <div className="dashboard-panel overflow-hidden">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Request history</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Submitted applications</h2>
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-subtle font-medium text-muted-foreground">
                  <th className="p-4">Tracking Number</th>
                  <th className="p-4">Document Type</th>
                  <th className="p-4">Date Submitted</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="civic-stagger divide-y divide-border">
                {requests.map((req: any, index: number) => {
                  const status = getStatusDetails(req.status);
                  const payment = getPaymentDetails(req.payment_status);
                  return (
                    <tr
                      key={req.id}
                      style={staggerStyle(index)}
                      className="transition-colors duration-200 hover:bg-surface-subtle"
                    >
                      <td className="p-4 font-mono font-semibold text-foreground">
                        {req.tracking_number}
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {req.services_registry?.name || req.request_type}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${status.styles}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${payment.styles}`}>
                          {payment.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to="/my-requests/$requestId"
                          params={{ requestId: req.id }}
                          className="civic-press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="civic-stagger divide-y divide-border md:hidden">
            {requests.map((req: any, index: number) => {
              const status = getStatusDetails(req.status);
              const payment = getPaymentDetails(req.payment_status);
              return (
                <div
                  key={req.id}
                  style={staggerStyle(index)}
                  className="space-y-3 p-4 transition-colors duration-200 hover:bg-surface-subtle"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono font-bold text-foreground">
                      {req.tracking_number}
                    </span>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-medium ${status.styles}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {req.services_registry?.name || req.request_type}
                    </h4>
                    <p className="text-2xs text-muted-foreground">
                      Submitted: {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Payment:</span>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium ${payment.styles}`}>
                        {payment.label}
                      </span>
                    </div>

                    <Link
                      to="/my-requests/$requestId"
                      params={{ requestId: req.id }}
                      className="civic-nudge inline-flex items-center gap-1 font-medium text-primary"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RequestStat({
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
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
          <CountUp value={value} className="mt-2 block text-3xl font-extrabold text-foreground" />
        </div>
        <div className="rounded-lg border border-border bg-surface-subtle p-2.5 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}
