import { ClipboardCheck } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { useSecurityCenterActions } from "../hooks/useSecurityCenterActions";
import {
  controlStatusLabels,
  formatSecurityDate,
} from "../security-center.utils";
import type { SecurityPolicyControl } from "../system-admin.types";

function controlVariant(status: SecurityPolicyControl["status"]) {
  if (status === "action_required") return "destructive";
  if (status === "review_due") return "warning";
  if (status === "monitoring") return "info";
  return "success";
}

export function SecurityPolicySection({
  controls,
}: {
  controls: SecurityPolicyControl[];
}) {
  const { pendingAction, reviewControl } = useSecurityCenterActions();

  if (controls.length === 0) {
    return (
      <section className="security-card" aria-label="Security controls">
        <p className="security-empty">No security controls are registered.</p>
      </section>
    );
  }

  return (
    <section className="security-controls" aria-label="Security controls">
      {controls.map((control) => {
        const isPending =
          pendingAction?.type === "control" && pendingAction.id === control.key;
        const canMarkReviewed =
          control.status === "review_due" || control.status === "monitoring";

        return (
          <article
            key={control.key}
            className="security-control"
            data-status={control.status}
          >
            <div className="security-control-top">
              <Badge variant={controlVariant(control.status)}>
                {controlStatusLabels[control.status]}
              </Badge>
              <span className="security-control-category capitalize">
                {control.category}
              </span>
            </div>
            <h3>{control.name}</h3>
            <p className="security-control-description">{control.description}</p>
            <div className="security-control-footer">
              <dl className="security-control-dates">
                <div>
                  <dt>Last reviewed</dt>
                  <dd>{formatSecurityDate(control.lastReviewedAt)}</dd>
                </div>
                <div>
                  <dt>Next review</dt>
                  <dd>{formatSecurityDate(control.nextReviewDueAt)}</dd>
                </div>
              </dl>
              {canMarkReviewed ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="security-pill-button"
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
                <span className="security-control-interval">
                  {control.reviewIntervalDays}-day interval
                </span>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
