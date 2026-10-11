import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { staggerStyle } from "~/components/motion/stagger";
import { StatFigure, StatFigures } from "~/components/portal/stat-figure";
import { pillButton, portalTable } from "~/components/portal/styles";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getStatusDetails, getPaymentDetails } from "~/features/services/request-status";
import { StatusPill } from "~/features/requests/components/StatusPill";
import { STAGES } from "~/features/requests/request-queue";
import { STAGE_LABELS, stageOf } from "~/features/requests/request-workflow";
import type { getMyRequestsFn } from "~/features/requests/applicant-requests.queries";
import { cn } from "~/lib/utils";

interface MyRequestsPageProps {
  requests: Awaited<ReturnType<typeof getMyRequestsFn>>;
}

type StatusVariant = ReturnType<typeof getStatusDetails>["variant"];

// Filled stage segments take the status pill's ink, so the bar and the pill
// above it read as one thing.
const STAGE_FILL: Record<StatusVariant, string> = {
  info: "bg-tone-review",
  progress: "bg-tone-progress",
  warning: "bg-tone-warning",
  success: "bg-tone-success",
  destructive: "bg-tone-danger",
  // A released request is done: its bar stays full but steps back.
  neutral: "bg-tone-neutral/50",
};

const PAYMENT_INK: Partial<Record<StatusVariant, string>> = {
  warning: "text-tone-warning",
  success: "text-tone-success",
};

/**
 * Payment as plain text. A fee is only owed once the request reaches the
 * counter, so until then an unpaid request reads "Not due yet" instead of
 * looking like a debt.
 */
function getPaymentText(status: string | null, paymentStatus: string | null) {
  const payment = getPaymentDetails(paymentStatus);
  const atCounter = status === "ready_for_release" || status === "released";
  if (payment.variant === "warning" && !atCounter) {
    return {
      label: status === "rejected" ? "Not due" : "Not due yet",
      className: "text-muted-foreground",
    };
  }
  return {
    label: payment.label,
    className: PAYMENT_INK[payment.variant] ?? "text-muted-foreground",
  };
}

function formatSubmitted(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MyRequestsPage({ requests }: MyRequestsPageProps) {
  const activeCount = requests.filter(
    (request: any) => !["released", "rejected"].includes(request.status ?? ""),
  ).length;
  const readyCount = requests.filter(
    (request: any) => request.status === "ready_for_release",
  ).length;
  // Payment is only ever due once a request reaches the counter — nothing
  // earlier in the workflow has a fee to pay yet, so counting every
  // `unpaid` row (the old logic) overstated this against requests still in
  // review.
  const paymentDueCount = requests.filter(
    (request: any) =>
      request.status === "ready_for_release" && request.payment_status !== "verified",
  ).length;

  return (
    <div className="portal-page">
      <header className="portal-card flex flex-wrap items-end gap-6 px-5 py-6 sm:px-8 sm:py-7">
        <div className="mr-auto flex max-w-160 flex-col gap-1.5">
          <h1 className="portal-title">My requests</h1>
          <p className="text-sm leading-normal text-muted-foreground">
            Track the status of your submitted civil registry requests in real time.
          </p>
        </div>
        <Link to="/services" className={cn(buttonVariants(), pillButton.primary)}>
          Submit a new request
        </Link>
      </header>

      {requests.length === 0 ? (
        <Empty className="portal-card civic-enter-scale gap-5 rounded-2xl px-8 py-16">
          <EmptyHeader className="max-w-110 gap-3">
            <EmptyMedia
              variant="icon"
              className="size-13 rounded-[14px] bg-primary-soft text-primary"
            >
              <FileText />
            </EmptyMedia>
            <EmptyTitle className="text-xl font-bold">No requests yet</EmptyTitle>
            <EmptyDescription className="leading-[1.55]">
              You haven't submitted any civil registry requests yet.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/services"
              className={cn(buttonVariants({ variant: "outline" }), pillButton.outline)}
            >
              Browse services
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <section className="portal-card px-5 pt-6 pb-5 sm:px-8 sm:pt-7">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-5">
            <div className="mr-auto flex flex-col gap-1">
              <p className="portal-eyebrow">Request history</p>
              <h2 className="portal-heading">
                Submitted applications{" "}
                <span className="font-medium whitespace-nowrap text-muted-foreground">
                  · {requests.length}
                </span>
              </h2>
            </div>
            <StatFigures>
              <StatFigure
                size="md"
                index={0}
                label="In progress"
                value={activeCount}
                dotClassName="bg-primary"
              />
              <StatFigure
                size="md"
                index={1}
                label="Ready for release"
                value={readyCount}
                dotClassName="bg-success"
              />
              <StatFigure
                size="md"
                index={2}
                label="Payment due"
                value={paymentDueCount}
                dotClassName="bg-brand-gold"
              />
            </StatFigures>
          </div>

          {/* Desktop Table View */}
          <div className="mt-6 hidden md:block">
            <Table className="min-w-225">
              <TableHeader>
                <TableRow className={portalTable.headRow}>
                  <TableHead className={portalTable.head}>Tracking no.</TableHead>
                  <TableHead className={portalTable.head}>Document</TableHead>
                  <TableHead className={portalTable.head}>Date submitted</TableHead>
                  <TableHead className={portalTable.head}>Status</TableHead>
                  <TableHead className={portalTable.head}>Payment</TableHead>
                  <TableHead className={cn(portalTable.head, "text-right")}>
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn("civic-stagger", portalTable.body)}>
                {requests.map((req: any, index: number) => {
                  const payment = getPaymentText(req.status, req.payment_status);
                  return (
                    <TableRow
                      key={req.id}
                      style={staggerStyle(index)}
                      className={portalTable.row}
                    >
                      <TableCell
                        className={cn(
                          portalTable.cell,
                          "font-mono text-[13px] font-semibold text-foreground",
                        )}
                      >
                        {req.tracking_number}
                      </TableCell>
                      <TableCell
                        className={cn(portalTable.cell, "font-medium text-foreground")}
                      >
                        {req.services_registry?.name || req.request_type}
                      </TableCell>
                      <TableCell className={cn(portalTable.cell, "text-muted-foreground")}>
                        {formatSubmitted(req.created_at)}
                      </TableCell>
                      <TableCell className={portalTable.cell}>
                        <div className="flex w-max flex-col items-start gap-2">
                          <StatusPill status={req.status} />
                          <StageProgress status={req.status} />
                        </div>
                      </TableCell>
                      <TableCell className={portalTable.cell}>
                        <span className={cn("text-[13px] font-semibold", payment.className)}>
                          {payment.label}
                        </span>
                      </TableCell>
                      <TableCell className={cn(portalTable.cell, "text-right")}>
                        <Link
                          to="/my-requests/$requestId"
                          params={{ requestId: req.id }}
                          className={portalTable.action}
                          aria-label={`View request ${req.tracking_number ?? ""}`}
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List View */}
          <div className="civic-stagger mt-6 divide-y divide-border-lighter border-y border-border-light md:hidden">
            {requests.map((req: any, index: number) => {
              const payment = getPaymentText(req.status, req.payment_status);
              return (
                <div
                  key={req.id}
                  style={staggerStyle(index)}
                  className="flex flex-col gap-3 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-[13px] font-semibold text-foreground">
                      {req.tracking_number}
                    </span>
                    <StatusPill status={req.status} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      {req.services_registry?.name || req.request_type}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Submitted: {formatSubmitted(req.created_at)}
                    </p>
                  </div>

                  <StageProgress status={req.status} />

                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] text-muted-foreground">
                      Payment:{" "}
                      <span className={cn("font-semibold", payment.className)}>
                        {payment.label}
                      </span>
                    </p>
                    <Link
                      to="/my-requests/$requestId"
                      params={{ requestId: req.id }}
                      className={portalTable.action}
                    >
                      View details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Where a request sits in the four-stage workflow: one segment per stage,
 * filled up to the current one, with the stage named beside it.
 */
function StageProgress({ status }: { status: string | null }) {
  const stage = stageOf(status);
  if (!stage) return null;

  const fill = STAGE_FILL[getStatusDetails(status).variant];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.75" aria-hidden="true">
        {STAGES.map((step) => (
          <span
            key={step}
            className={cn("h-1 w-5.5 rounded-xs", step <= stage ? fill : "bg-border-light")}
          />
        ))}
      </div>
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {status === "released"
          ? "Complete"
          : `Stage ${stage} of 4 · ${STAGE_LABELS[stage]}`}
      </span>
    </div>
  );
}
