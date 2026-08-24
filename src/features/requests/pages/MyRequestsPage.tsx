import { Link } from "@tanstack/react-router";
import { FileText, ChevronRight, Eye } from "lucide-react";
import { CountUp } from "~/components/motion/count-up";
import { staggerStyle } from "~/components/motion/stagger";
import { Badge } from "~/components/ui/badge";
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
import type { getMyRequestsFn } from "~/features/requests/applicant-requests.queries";
import { cn } from "~/lib/utils";

interface MyRequestsPageProps {
  requests: Awaited<ReturnType<typeof getMyRequestsFn>>;
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
          className={cn(
            buttonVariants({ size: "lg" }),
            "civic-press shrink-0 bg-white text-primary shadow-sm hover:bg-primary-soft",
          )}
        >
          Submit a new request
        </Link>
        </div>
      </header>

      {requests.length === 0 ? (
        <Empty className="dashboard-panel civic-enter-scale mx-auto mt-8 max-w-lg border-0 px-6 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-primary text-white shadow-md">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No requests found</EmptyTitle>
            <EmptyDescription>
              You haven't submitted any civil registry requests yet.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              to="/services"
              className={buttonVariants({ variant: "outline" })}
            >
              Browse services
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="dashboard-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Request history</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
                Submitted applications ·{" "}
                <span className="text-muted-foreground">{requests.length}</span>
              </h2>
            </div>
            <dl className="civic-stagger flex flex-wrap gap-x-6 gap-y-3">
              <SummaryFigure index={0} label="In progress" value={activeCount} dotClassName="bg-primary" />
              <SummaryFigure index={1} label="Ready for release" value={readyCount} dotClassName="bg-success" />
              <SummaryFigure index={2} label="Payment due" value={paymentDueCount} dotClassName="bg-brand-gold" />
            </dl>
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-subtle">
                  <TableHead className="p-4">Tracking Number</TableHead>
                  <TableHead className="p-4">Document Type</TableHead>
                  <TableHead className="p-4">Date Submitted</TableHead>
                  <TableHead className="p-4">Status</TableHead>
                  <TableHead className="p-4">Payment</TableHead>
                  <TableHead className="p-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="civic-stagger">
                {requests.map((req: any, index: number) => {
                  const status = getStatusDetails(req.status);
                  const payment = getPaymentDetails(req.payment_status);
                  return (
                    <TableRow
                      key={req.id}
                      style={staggerStyle(index)}
                      className="transition-colors duration-200 hover:bg-surface-subtle"
                    >
                      <TableCell className="p-4 font-mono font-semibold text-foreground">
                        {req.tracking_number}
                      </TableCell>
                      <TableCell className="p-4 font-medium text-foreground">
                        {req.services_registry?.name || req.request_type}
                      </TableCell>
                      <TableCell className="p-4 text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge variant={payment.variant}>{payment.label}</Badge>
                      </TableCell>
                      <TableCell className="p-4 text-right">
                        <Link
                          to="/my-requests/$requestId"
                          params={{ requestId: req.id }}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Eye data-icon="inline-start" aria-hidden="true" />
                          Details
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
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
                      <Badge variant={payment.variant}>
                        {payment.label}
                      </Badge>
                    </div>

                    <Link
                      to="/my-requests/$requestId"
                      params={{ requestId: req.id }}
                      className={cn(
                        buttonVariants({ variant: "link", size: "sm" }),
                        "civic-nudge px-0",
                      )}
                    >
                      View details
                      <ChevronRight data-icon="inline-end" />
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

function SummaryFigure({
  label,
  value,
  dotClassName,
  index,
}: {
  label: string;
  value: number;
  dotClassName: string;
  index: number;
}) {
  return (
    <div className="min-w-20" style={staggerStyle(index)}>
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <span className={`size-1.5 shrink-0 rounded-full ${dotClassName}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
        <CountUp value={value} />
      </dd>
    </div>
  );
}
