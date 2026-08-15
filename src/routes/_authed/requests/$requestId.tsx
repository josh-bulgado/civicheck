import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { hasPermission, type Role } from "~/lib/permissions";
import { usePermissions } from "~/hooks/usePermissions";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { getRequestDetailFn } from "~/features/requests/requests.queries";
import {
  advanceRequestStatusFn,
  setAttachmentVerificationFn,
  verifyPaymentFn,
} from "~/features/requests/requests.mutations";
import {
  REASON_REQUIRED,
  STAGE_LABELS,
  TRANSITION_LABELS,
  getPaymentDetails,
  getStatusDetails,
  nextStatuses,
  stageOf,
  type RequestStatus,
} from "~/features/requests/request-workflow";

export const Route = createFileRoute("/_authed/requests/$requestId")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_all"))
      throw new Error("Forbidden");
  },
  loader: ({ params }) => getRequestDetailFn({ data: { requestId: params.requestId } }),
  component: RequestDetailPage,
});

function formatKey(key: string) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RequestDetailPage() {
  const request = Route.useLoaderData();
  const router = useRouter();
  const { can } = usePermissions();

  const [remarks, setRemarks] = useState("");
  const [orNumber, setOrNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const status = getStatusDetails(request.status);
  const payment = getPaymentDetails(request.paymentStatus);
  const stage = stageOf(request.status);
  const available = nextStatuses(request.status);

  const canProcess = can("requests:process");
  const canCollect = can("requests:collect_payment");

  async function handleTransition(to: RequestStatus) {
    if (REASON_REQUIRED.includes(to) && !remarks.trim()) {
      toast.error("Give the applicant a reason first.", {
        description: "Fill in the remarks box below before this decision.",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await advanceRequestStatusFn({
        data: { requestId: request.id, toStatus: to, remarks },
      });
      if (res.error) {
        toast.error("Could not update this request", { description: res.message });
        return;
      }
      toast.success(`Moved to ${getStatusDetails(to).label}`);
      setRemarks("");
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyPayment() {
    setBusy(true);
    try {
      const res = await verifyPaymentFn({
        data: { requestId: request.id, orNumber },
      });
      if (res.error) {
        toast.error("Could not verify payment", { description: res.message });
        return;
      }
      toast.success("Payment verified");
      setOrNumber("");
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  async function handleAttachment(
    attachmentId: string,
    next: "approved" | "rejected",
  ) {
    setBusy(true);
    try {
      const res = await setAttachmentVerificationFn({
        data: {
          attachmentId,
          status: next,
          reason: next === "rejected" ? remarks || "Document not acceptable." : undefined,
        },
      });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dashboard-page max-w-5xl">
      <Link
        to="/requests"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to the queue
      </Link>

      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              {stage ? `Stage ${stage} · ${STAGE_LABELS[stage]}` : "Unknown stage"}
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
              {request.trackingNumber}
            </h1>
            <p className="mt-2 text-sm text-white/75">
              {request.applicantName} · {request.serviceName}
              {request.isWalkIn ? " · Walk-in" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${status.styles}`}
            >
              {status.label}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${payment.styles}`}
            >
              {payment.label}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">Submitted details</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {Object.entries(request.formData).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {formatKey(key)}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {value == null || value === "" ? "—" : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Uploaded requirements ({request.attachments.length})
            </h2>
            {request.attachments.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Nothing was pre-uploaded. Validate the physical documents at the counter.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {request.attachments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-light p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {doc.requirementName}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {doc.verificationStatus}
                        {doc.rejectionReason ? ` — ${doc.rejectionReason}` : ""}
                      </p>
                    </div>
                    {canProcess && doc.verificationStatus === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleAttachment(doc.id, "approved")}
                        >
                          <CheckCircle2 className="size-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => handleAttachment(doc.id, "rejected")}
                        >
                          <XCircle className="size-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">History</h2>
            <ol className="flex flex-col gap-4">
              {request.logs.map((log) => (
                <li key={log.id} className="flex gap-4">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {getStatusDetails(log.actionStatus).label}
                    </p>
                    {log.remarks && (
                      <p className="text-sm text-muted-foreground">{log.remarks}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)} · {log.actorName}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-foreground">Move this request</h2>

            {!canProcess ? (
              <p className="text-sm italic text-muted-foreground">
                Your role can view this request but not advance it.
              </p>
            ) : available.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                This request is {status.label.toLowerCase()} — nothing further to do.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="remarks">
                    Remarks
                    {available.some((s) => REASON_REQUIRED.includes(s))
                      ? " (required to reject or mark incomplete)"
                      : " (optional)"}
                  </Label>
                  <Textarea
                    id="remarks"
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="What should the applicant know?"
                  />
                </div>

                {available.map((next) => (
                  <Button
                    key={next}
                    variant={next === "rejected" ? "outline" : "default"}
                    disabled={busy}
                    onClick={() => handleTransition(next)}
                  >
                    {TRANSITION_LABELS[next]}
                  </Button>
                ))}

                {request.status === "ready_for_release" &&
                  request.paymentStatus !== "verified" && (
                    <p className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-warning-strong">
                      Payment must be verified before this can be released.
                    </p>
                  )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-white p-6">
            <h2 className="mb-1 text-lg font-bold text-foreground">Payment</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Fee due: ₱{request.feesDue.toFixed(2)}
            </p>

            {request.paymentStatus === "verified" ? (
              <p className="text-sm text-foreground">
                Verified against OR{" "}
                <span className="font-bold">{request.orNumber ?? "—"}</span>.
              </p>
            ) : canCollect ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="or-number">Official receipt number</Label>
                  <Input
                    id="or-number"
                    value={orNumber}
                    onChange={(e) => setOrNumber(e.target.value)}
                    placeholder="OR-000123"
                  />
                </div>
                <Button disabled={busy || !orNumber.trim()} onClick={handleVerifyPayment}>
                  Verify payment
                </Button>
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                The cashier records payment against the official receipt.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
