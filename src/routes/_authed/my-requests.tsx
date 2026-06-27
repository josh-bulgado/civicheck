import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import { useState } from "react";
import {
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock3,
  CreditCard
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~/components/ui/dialog";

// Fetch applicant's requests
const getMyRequests = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }
  
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
  loader: () => getMyRequests(),
  component: MyRequestsPage,
});

function MyRequestsPage() {
  const requests = Route.useLoaderData();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Status mapping
  const getStatusDetails = (status: string | null) => {
    switch (status) {
      case "pending_frontdesk":
        return { label: "Pending Review", styles: "bg-slate-50 text-slate-700 border-slate-200" };
      case "under_validation":
        return { label: "Under Validation", styles: "bg-blue-50 text-blue-700 border-blue-200" };
      case "incomplete":
        return { label: "Incomplete", styles: "bg-amber-50 text-amber-700 border-amber-200" };
      case "rejected":
        return { label: "Rejected", styles: "bg-rose-50 text-rose-700 border-rose-200" };
      case "processing":
        return { label: "Processing", styles: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "pending_approval":
        return { label: "Pending Approval", styles: "bg-purple-50 text-purple-700 border-purple-200" };
      case "ready_for_release":
        return { label: "Ready for Release", styles: "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse" };
      case "released":
        return { label: "Released", styles: "bg-teal-50 text-teal-700 border-teal-200" };
      default:
        return { label: status || "Unknown", styles: "bg-gray-50 text-gray-700 border-gray-200" };
    }
  };

  const getPaymentDetails = (paymentStatus: string | null) => {
    switch (paymentStatus) {
      case "unpaid":
        return { label: "Unpaid", styles: "bg-rose-50 text-rose-700 border-rose-200" };
      case "verified":
        return { label: "Paid", styles: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default:
        return { label: paymentStatus || "Unpaid", styles: "bg-gray-50 text-gray-700 border-gray-200" };
    }
  };

  const formatFormDataKey = (key: string) => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Requests</h1>
          <p className="text-muted-foreground text-sm">
            Track the status of your submitted civil registry requests in real time.
          </p>
        </div>
        <Link
          to="/services"
          className="inline-flex items-center justify-center rounded-lg bg-[#1a4480] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#1a4480]/90 transition-colors shrink-0"
        >
          Submit New Request
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-xs space-y-4 max-w-md mx-auto mt-8">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-gray-900">No requests found</h3>
            <p className="text-sm text-gray-500">
              You haven't submitted any civil registry requests yet.
            </p>
          </div>
          <Link
            to="/services"
            className="inline-flex rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            Browse Services
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50/50 text-gray-500 font-medium">
                  <th className="p-4">Tracking Number</th>
                  <th className="p-4">Document Type</th>
                  <th className="p-4">Date Submitted</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req: any) => {
                  const status = getStatusDetails(req.status);
                  const payment = getPaymentDetails(req.payment_status);
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-mono font-semibold text-gray-900">
                        {req.tracking_number}
                      </td>
                      <td className="p-4 font-medium text-gray-700">
                        {req.services_registry?.name || req.request_type}
                      </td>
                      <td className="p-4 text-gray-500">
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
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
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
          <div className="md:hidden divide-y divide-gray-100">
            {requests.map((req: any) => {
              const status = getStatusDetails(req.status);
              const payment = getPaymentDetails(req.payment_status);
              return (
                <div key={req.id} className="p-4 space-y-3 hover:bg-slate-50/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono font-bold text-gray-900">
                      {req.tracking_number}
                    </span>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-medium ${status.styles}`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-semibold text-gray-800 text-sm">
                      {req.services_registry?.name || req.request_type}
                    </h4>
                    <p className="text-2xs text-gray-400">
                      Submitted: {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Payment:</span>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium ${payment.styles}`}>
                        {payment.label}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="inline-flex items-center gap-1 text-[#1a4480] font-medium"
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
              <DialogTitle className="text-lg font-bold text-gray-900">
                Request Details
              </DialogTitle>
              <DialogDescription className="text-xs font-mono font-semibold text-slate-500">
                Tracking Number: {selectedRequest.tracking_number}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-xs">Document Type</span>
                  <span className="font-medium text-gray-900 text-right">
                    {selectedRequest.services_registry?.name || selectedRequest.request_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-xs">Status</span>
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium ${getStatusDetails(selectedRequest.status).styles}`}>
                    {getStatusDetails(selectedRequest.status).label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-xs">Payment</span>
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium ${getPaymentDetails(selectedRequest.payment_status).styles}`}>
                    {getPaymentDetails(selectedRequest.payment_status).label}
                  </span>
                </div>
                {Number(selectedRequest.fees_due) > 0 && (
                  <div className="flex justify-between border-t border-slate-200/50 pt-2">
                    <span className="text-gray-500 text-xs font-medium">Fees Due</span>
                    <span className="font-bold text-[#1a4480]">
                      ₱{Number(selectedRequest.fees_due).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Form Data Fields */}
              {selectedRequest.form_data && typeof selectedRequest.form_data === "object" && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Submitted Form Details
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {Object.entries(selectedRequest.form_data).map(([key, val]: [string, any]) => {
                      if (!val || String(val).trim() === "") return null;
                      return (
                        <div key={key} className="border-b border-gray-50 pb-1.5">
                          <span className="block text-2xs text-gray-400">
                            {formatFormDataKey(key)}
                          </span>
                          <span className="font-medium text-gray-800 text-xs leading-relaxed">
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
