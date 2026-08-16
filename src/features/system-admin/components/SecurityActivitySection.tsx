import { Fingerprint, History, LogIn, Shield } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  formatSecurityTimestamp,
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
    <section
      className="h-full min-w-0"
      aria-labelledby="security-activity-title"
    >
      <Card className="h-full gap-0 pb-0 [--card-spacing:--spacing(5)]">
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <History className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <CardTitle>
                <h2 id="security-activity-title" className="text-balance">
                  Recent Security Activity
                </h2>
              </CardTitle>
              <CardDescription className="text-pretty">
                Redacted authentication signals, administrator sessions, and
                sensitive actions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <Table className="min-w-176">
            <TableCaption className="sr-only">
              Recent redacted security events and privileged actions
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6">Activity</TableHead>
                <TableHead className="px-4">Actor</TableHead>
                <TableHead className="px-4">Risk</TableHead>
                <TableHead className="px-6 text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => {
                const content = activityContent[activity.type];
                const Icon = content.icon;
                return (
                  <TableRow key={activity.id}>
                    <TableCell className="max-w-lg whitespace-normal px-6 py-4">
                      <div className="flex items-start gap-3">
                        <Icon
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {content.label}
                          </p>
                          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                            {activity.summary}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-44 whitespace-normal px-4 py-4 break-words">
                      {activity.actor}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge
                        variant={
                          activity.risk === "critical" ||
                          activity.risk === "high"
                            ? "destructive"
                            : "outline"
                        }
                      >
                        {severityLabels[activity.risk]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right font-mono text-xs tabular-nums">
                      <time dateTime={activity.timestamp}>
                        {formatSecurityTimestamp(activity.timestamp)}
                      </time>
                    </TableCell>
                  </TableRow>
                );
              })}
              {activities.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-36 text-center text-muted-foreground"
                  >
                    No recent security activity was recorded.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
