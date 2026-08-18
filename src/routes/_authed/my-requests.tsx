import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { hasPermission, type Role } from "~/lib/permissions";
import { useState } from "react";
import {
  FileText,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock3,
  CreditCard
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { getStatusDetails, getPaymentDetails } from "~/features/services/request-status";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

// Fetch applicant's requests
const getMyRequests = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await requireActiveSession("requests:view_own");
  
  const { data, error } = await supabase
    .from("requests")
    .select(`
      id,
      tracking_number,
      request_type,
      status,
      payment_status,
      created_at,
      fees_due,
      form_data,
      services_registry (
        name
      )
    `)
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });
    
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
});

export const Route = createFileRoute("/_authed/my-requests")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own")) throw new Error("Forbidden");
  },
  loader: () => getMyRequests(),
  component: MyRequestsPage,
});

function MyRequestsPage() {
  const requests = Route.useLoaderData();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
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

  const formatFormDataKey = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="civic-press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
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
                    
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="civic-nudge inline-flex items-center gap-1 font-medium text-primary"
                    >
                      View Details
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details Dialog */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                Request Details
              </DialogTitle>
              <DialogDescription className="font-mono text-xs font-semibold text-muted-foreground">
                Tracking Number: {selectedRequest.tracking_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm">
              <div className="space-y-2 rounded-lg border border-border bg-surface-subtle p-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Document Type</span>
                  <span className="text-right font-medium text-foreground">
                    {selectedRequest.services_registry?.name || selectedRequest.request_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium ${getStatusDetails(selectedRequest.status).styles}`}>
                    {getStatusDetails(selectedRequest.status).label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Payment</span>
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium ${getPaymentDetails(selectedRequest.payment_status).styles}`}>
                    {getPaymentDetails(selectedRequest.payment_status).label}
                  </span>
                </div>
                {Number(selectedRequest.fees_due) > 0 && (
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-xs font-medium text-muted-foreground">Fees Due</span>
                    <span className="font-bold text-primary">
                      ₱{Number(selectedRequest.fees_due).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Form Data Fields */}
              {selectedRequest.form_data && typeof selectedRequest.form_data === "object" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Submitted Form Details
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {Object.entries(selectedRequest.form_data).map(([key, val]: [string, any]) => {
                      if (!val || String(val).trim() === "") return null;
                      return (
                        <div key={key} className="border-b border-border pb-1.5">
                          <span className="block text-2xs text-muted-foreground">
                            {formatFormDataKey(key)}
                          </span>
                          <span className="text-xs font-medium leading-relaxed text-foreground">
                            {key === "event_date" 
                              ? new Date(val).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })
                              : String(val)
                            }
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
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
