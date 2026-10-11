import { Link } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { staggerStyle } from "~/components/motion/stagger";
import { StatFigure, StatFigures } from "~/components/portal/stat-figure";
import { portalTable } from "~/components/portal/styles";
import { StatusPill } from "~/features/requests/components/StatusPill";
import { formatPesoFee } from "~/features/services/service-utils";
import { cn } from "~/lib/utils";
import type { CitizenDashboardRequest } from "../types";

const ACTIVE_PREVIEW_COUNT = 5;

interface ActiveRequestsPanelProps {
  /** Every request that hasn't reached a terminal status. */
  requests: CitizenDashboardRequest[];
  readyForRelease: number;
  paymentDue: number;
}

/**
 * The dashboard's lead card: the three headline counts, then the first few
 * requests still in progress.
 */
export function ActiveRequestsPanel({
  requests,
  readyForRelease,
  paymentDue,
}: ActiveRequestsPanelProps) {
  const preview = requests.slice(0, ACTIVE_PREVIEW_COUNT);

  return (
    <section className="portal-card px-5 pt-6 pb-5 sm:px-8 sm:pt-7">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-5">
        <h1 className="portal-title mr-auto">Your requests</h1>
        <StatFigures>
          <StatFigure
            index={0}
            label="In progress"
            value={requests.length}
            dotClassName="bg-primary"
          />
          <StatFigure
            index={1}
            label="Ready for release"
            value={readyForRelease}
            dotClassName="bg-success"
          />
          <StatFigure
            index={2}
            label="Payment due"
            value={paymentDue}
            dotClassName="bg-brand-gold"
          />
        </StatFigures>
      </div>

      {requests.length === 0 ? (
        <p className="mt-6 border-y border-border-light py-10 text-center text-sm text-muted-foreground">
          Nothing in progress — everything you've submitted has been released or resolved.
        </p>
      ) : (
        <>
          <div className="mt-6 hidden md:block">
            <Table className="min-w-190">
              <TableHeader>
                <TableRow className={portalTable.headRow}>
                  <TableHead className={portalTable.head}>Tracking no.</TableHead>
                  <TableHead className={portalTable.head}>Document</TableHead>
                  <TableHead className={portalTable.head}>Status</TableHead>
                  <TableHead className={portalTable.head}>Submitted</TableHead>
                  <TableHead className={portalTable.head}>Fees</TableHead>
                  <TableHead className={cn(portalTable.head, "text-right")}>
                    Details
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={cn("civic-stagger", portalTable.body)}>
                {preview.map((request, index) => (
                  <TableRow
                    key={request.id}
                    style={staggerStyle(index)}
                    className={portalTable.row}
                  >
                    <TableCell
                      className={cn(
                        portalTable.cell,
                        "font-mono text-[13px] font-semibold text-foreground",
                      )}
                    >
                      {request.tracking_number}
                    </TableCell>
                    <TableCell className={cn(portalTable.cell, "font-medium text-foreground")}>
                      {request.services_registry?.name || request.request_type}
                    </TableCell>
                    <TableCell className={portalTable.cell}>
                      <StatusPill status={request.status} />
                    </TableCell>
                    <TableCell className={cn(portalTable.cell, "text-muted-foreground")}>
                      {new Date(request.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell
                      className={cn(portalTable.cell, "text-muted-foreground tabular-nums")}
                    >
                      {formatPesoFee(request.fees_due)}
                    </TableCell>
                    <TableCell className={cn(portalTable.cell, "text-right")}>
                      <Link
                        to="/my-requests/$requestId"
                        params={{ requestId: request.id }}
                        className={portalTable.action}
                        aria-label={`View request ${request.tracking_number ?? ""}`}
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="civic-stagger mt-6 divide-y divide-border-lighter border-y border-border-light md:hidden">
            {preview.map((request, index) => (
              <Link
                key={request.id}
                to="/my-requests/$requestId"
                params={{ requestId: request.id }}
                style={staggerStyle(index)}
                className="flex items-center justify-between gap-3 py-3.5 transition-colors duration-200 hover:bg-surface-subtle"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-[13px] font-semibold text-foreground">
                    {request.tracking_number}
                  </p>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {request.services_registry?.name || request.request_type}
                  </p>
                </div>
                <StatusPill status={request.status} />
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="flex justify-end pt-4">
        <Link
          to="/my-requests"
          className="text-sm font-bold text-primary hover:text-primary-hover"
        >
          View all requests →
        </Link>
      </div>
    </section>
  );
}
