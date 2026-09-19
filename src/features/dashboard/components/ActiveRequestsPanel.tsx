import { Link } from "@tanstack/react-router";
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
import { staggerStyle } from "~/components/motion/stagger";
import { getStatusDetails } from "~/features/requests/request-workflow";
import type { RealtimeStatus } from "~/hooks/useRealtimeRefresh";
import type { CitizenDashboardRequest } from "../types";

const ACTIVE_PREVIEW_COUNT = 5;

interface ActiveRequestsPanelProps {
  requests: CitizenDashboardRequest[];
  realtimeStatus: RealtimeStatus;
}

export function ActiveRequestsPanel({
  requests,
  realtimeStatus,
}: ActiveRequestsPanelProps) {
  return (
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

      {requests.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
          Nothing in progress — everything you've submitted has been released or resolved.
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
                {requests.slice(0, ACTIVE_PREVIEW_COUNT).map((request, index) => {
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
                        <Badge variant={status.variant}>{status.label}</Badge>
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
            {requests.slice(0, ACTIVE_PREVIEW_COUNT).map((request, index) => {
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

          {requests.length > ACTIVE_PREVIEW_COUNT && (
            <div className="border-t border-border px-5 py-3.5 text-center sm:px-6">
              <Link to="/my-requests" className="text-[13px] font-bold text-primary">
                View all {requests.length} active requests →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
