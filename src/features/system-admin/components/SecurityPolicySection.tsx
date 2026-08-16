import { CalendarClock, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { useSecurityCenterActions } from "../hooks/useSecurityCenterActions";
import {
  controlStatusLabels,
  formatSecurityDate,
} from "../security-center.utils";
import type { SecurityPolicyControl } from "../system-admin.types";

function controlVariant(status: SecurityPolicyControl["status"]) {
  if (status === "action_required") return "destructive";
  if (status === "enforced") return "secondary";
  return "outline";
}

export function SecurityPolicySection({
  controls,
}: {
  controls: SecurityPolicyControl[];
}) {
  const { pendingAction, reviewControl } = useSecurityCenterActions();

  return (
    <section aria-labelledby="security-policy-title">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
          Control register
        </p>
        <h2
          id="security-policy-title"
          className="mt-1 text-xl font-bold tracking-tight"
        >
          Policy and credential reviews
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review status and reminders only. Credential values are never stored.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {controls.map((control) => {
          const isPending =
            pendingAction?.type === "control" &&
            pendingAction.id === control.key;
          const canMarkReviewed =
            control.status === "review_due" || control.status === "monitoring";

          return (
            <Card key={control.key} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={controlVariant(control.status)}>
                    {control.status === "enforced" ? (
                      <CheckCircle2 data-icon="inline-start" />
                    ) : (
                      <CalendarClock data-icon="inline-start" />
                    )}
                    {controlStatusLabels[control.status]}
                  </Badge>
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {control.category}
                  </span>
                </div>
                <CardTitle>
                  <h3 className="mt-1 font-bold">{control.name}</h3>
                </CardTitle>
                <CardDescription className="leading-6">
                  {control.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs leading-5 text-muted-foreground">
                  {control.evidenceSummary}
                </p>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Last reviewed</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {formatSecurityDate(control.lastReviewedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Next review</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {formatSecurityDate(control.nextReviewDueAt)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
              <CardFooter className="min-h-9 justify-end">
                {canMarkReviewed ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => void reviewControl(control.key)}
                  >
                    {isPending ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <ClipboardCheck data-icon="inline-start" />
                    )}
                    Mark reviewed
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {control.reviewIntervalDays}-day review interval
                  </span>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
