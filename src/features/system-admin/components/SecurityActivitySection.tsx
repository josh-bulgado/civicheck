import { QuietLink as Link } from "~/components/quiet-link";
import { ChevronRight, Fingerprint, LogIn, Shield } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { buttonVariants } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import {
  describeActivity,
  formatSecurityShortTimestamp,
  severityBadgeVariant,
  severityLabels,
} from "../security-center.utils";
import type { SecurityActivity } from "../system-admin.types";

const activityContent = {
  sign_in_failed: { label: "Rejected sign-in", icon: Fingerprint },
  admin_session_started: { label: "Admin session", icon: LogIn },
  staff_session_started: { label: "Staff session", icon: LogIn },
  privileged_action: { label: "Privileged action", icon: Shield },
};

export function SecurityActivitySection({
  activities,
}: {
  activities: SecurityActivity[];
}) {
  return (
    <section className="security-card" aria-labelledby="security-activity-title">
      <div className="security-card-header">
        <h2 id="security-activity-title">Last 24 hours</h2>
        <Link
          to="/system-admin/audit"
          search={{ page: 1, source: "sign-in" }}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "security-pill-button",
          )}
        >
          <ChevronRight data-icon="inline-start" aria-hidden="true" />
          View full sign-in history
        </Link>
      </div>
      {activities.length > 0 ? (
        <Table className="security-table">
          <TableCaption className="sr-only">
            Recent redacted security events and privileged actions
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => {
              const content = activityContent[activity.type];
              const Icon = content.icon;
              return (
                <TableRow key={activity.id}>
                  <TableCell className="security-cell-wrap">
                    <div className="security-activity-name">
                      <span className="security-activity-icon">
                        <Icon aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="security-cell-title">{content.label}</p>
                        <p className="security-cell-sub">
                          {describeActivity(activity)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="security-cell-actor">
                    {activity.actor}
                  </TableCell>
                  <TableCell>
                    <Badge variant={severityBadgeVariant(activity.risk)}>
                      {severityLabels[activity.risk]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <time dateTime={activity.timestamp}>
                      {formatSecurityShortTimestamp(activity.timestamp)}
                    </time>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="security-empty">No recent security activity was recorded.</p>
      )}
    </section>
  );
}
