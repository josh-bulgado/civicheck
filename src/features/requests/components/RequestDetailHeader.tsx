import type { ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import {
  STAGE_LABELS,
  STAGE_OF,
  getPaymentDetails,
  getStatusDetails,
  isRequestStatus,
  type WorkflowStage,
} from "~/features/requests/request-workflow";
import { cn } from "~/lib/utils";

const STAGES = Object.keys(STAGE_LABELS).map(Number) as WorkflowStage[];

type StepState = "done" | "current" | "problem" | "todo";

function stepState(stage: WorkflowStage, status: string | null): StepState {
  if (!isRequestStatus(status)) return "todo";
  const current = STAGE_OF[status];
  if (status === "released") return "done";
  if (status === "rejected" && stage === current) return "problem";
  if (stage < current) return "done";
  return stage === current ? "current" : "todo";
}

/** The four workflow stages, labelled, with the request's place marked. */
function StageSteps({ status }: { status: string | null }) {
  return (
    <ol
      aria-label="Workflow stage"
      className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground"
    >
      {STAGES.map((stage, index) => {
        const state = stepState(stage, status);
        return (
          <li
            key={stage}
            aria-current={state === "current" ? "step" : undefined}
            className={cn(
              "flex items-center gap-2",
              state === "current" && "font-semibold text-foreground",
              state === "done" && "text-body",
              state === "problem" && "font-semibold text-destructive",
            )}
          >
            {index > 0 && (
              <span aria-hidden="true" className="h-px w-5 bg-border-strong" />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "grid size-4 place-items-center rounded-full border-[1.5px] border-border-strong",
                state === "done" && "border-success bg-success text-card",
                state === "current" && "border-primary-fill bg-primary-soft ring-[3px] ring-inset ring-primary-fill",
                state === "problem" && "border-destructive bg-tone-danger-soft ring-[3px] ring-inset ring-destructive",
              )}
            >
              {state === "done" && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            {STAGE_LABELS[stage]}
          </li>
        );
      })}
    </ol>
  );
}

interface RequestDetailHeaderProps {
  trackingNumber: string;
  status: string;
  paymentStatus: string;
  feesDue: number;
  subtitle: ReactNode;
  /** Extra badges after status and payment, such as "waiting for a reply". */
  badges?: ReactNode;
  /** The request's actions, on the right. */
  actions?: ReactNode;
  /** A band along the bottom, for the next-step line. */
  footer?: ReactNode;
  /** Back to the queue; the button also names the Escape key that does it. */
  onBack: () => void;
}

/**
 * The staff request page's header: who and what on the left, status and the
 * request's actions on the right, the workflow stages underneath. A card in the
 * same style as the registries, so the work starts higher on the screen.
 */
export function RequestDetailHeader({
  trackingNumber,
  status,
  paymentStatus,
  feesDue,
  subtitle,
  badges,
  actions,
  footer,
  onBack,
}: RequestDetailHeaderProps) {
  const statusDetails = getStatusDetails(status);
  const payment = getPaymentDetails(paymentStatus, feesDue);

  async function copyTrackingNumber() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      toast.success(`Copied ${trackingNumber}`);
    } catch {
      toast.error("Could not copy. Select the number and copy it instead.");
    }
  }

  return (
    <header className="flex flex-col gap-4 rounded-xl border border-border-strong bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="xs"
            className="-ml-2 text-primary"
            onClick={onBack}
          >
            Back to the queue <Kbd>Esc</Kbd>
          </Button>
          <div className="flex items-center gap-1">
            <h1 className="font-mono text-xl font-semibold tracking-tight text-foreground">
              {trackingNumber}
            </h1>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copyTrackingNumber}
              aria-label="Copy tracking number"
            >
              <Copy aria-hidden="true" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusDetails.variant}>{statusDetails.label}</Badge>
          {feesDue > 0 && <Badge variant={payment.variant}>{payment.label}</Badge>}
          {badges}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border-light pt-3">
        <StageSteps status={status} />
        {actions}
      </div>

      {footer && (
        <div className="-mx-5 -mb-4 rounded-b-xl border-t border-border-light bg-muted/40 px-5 py-3">
          {footer}
        </div>
      )}
    </header>
  );
}
