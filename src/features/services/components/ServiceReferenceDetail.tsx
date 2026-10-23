import { useId, useMemo, useState } from "react";
import { Clock, Copy, Files, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import {
  ChecklistLoadError,
  ConditionalDocuments,
  OfficeSteps,
  RequiredDocuments,
} from "~/features/services/components/ChecklistSections";
import { FactsStrip } from "~/features/services/components/FactsStrip";
import { useServiceOverview } from "~/features/services/hooks/useServiceOverview";
import type { ServiceSummary } from "~/features/services/services.queries";
import { parseFeeComponents } from "~/features/services/fee-components";
import {
  caseLabel,
  checklistFor,
  checklistText,
  feeBreakdownLabel,
  feeRangeLabel,
} from "~/features/services/service-reference";
import {
  cleanStepText,
  formatPesoFee,
  getVisitBadge,
  summarizeWait,
} from "~/features/services/service-utils";

/** The picker's "no case chosen" value: the page then shows every case's documents. */
const ALL_CASES = "all";

/**
 * One service's answer for the counter: the visitor's case, what the cashier
 * will charge, how long it takes, and the documents that apply to them. Keyed
 * by service in the page, so each service opens on "All cases".
 */
export function ServiceReferenceDetail({
  service,
}: {
  service: ServiceSummary;
}) {
  const routeCode = service.display_group ?? service.service_code;
  const title = service.display_name ?? service.name;
  const { overview, loading, error, retry } = useServiceOverview(
    routeCode,
    true,
  );
  const [pickedCase, setPickedCase] = useState(ALL_CASES);
  const caseLabelId = useId();

  const isGroup = overview?.isGroup ?? service.display_group !== null;
  const cases = overview?.services ?? [];
  // A single service has one case and nothing to pick; a grouped one has the
  // case staff chose, or none yet.
  const active = isGroup
    ? (cases.find((item) => item.service_code === pickedCase) ?? null)
    : (cases[0] ?? null);

  const checklist = useMemo(
    () =>
      overview
        ? checklistFor(
            overview.requirements as ServiceRequirement[],
            isGroup ? (active?.service_code ?? null) : null,
          )
        : null,
    [overview, isGroup, active],
  );

  const time = active?.processing_time ?? service.processing_time;
  const visit = getVisitBadge(time);
  const fee = active
    ? formatPesoFee(active.fee)
    : feeRangeLabel(service.fee_min, service.fee_max);
  const breakdown = active
    ? feeBreakdownLabel(parseFeeComponents(active.fee_components))
    : null;
  const steps = (active?.steps_description ?? [])
    .map(cleanStepText)
    .filter((step) => step.length > 0);

  async function copyChecklist() {
    if (!checklist) return;
    const text = checklistText({
      title,
      caseText: active && isGroup ? caseLabel(active) : null,
      fee,
      time,
      checklist,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Checklist copied");
    } catch {
      toast.error("Couldn't copy the checklist", {
        description: "Your browser blocked it. Select the list and copy it instead.",
      });
    }
  }

  return (
    <Card className="min-w-0 gap-5 px-5 sm:px-6" aria-busy={loading}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Badge variant={visit.tone}>{visit.label}</Badge>
          <h2 className="text-xl font-bold tracking-tight text-balance text-foreground">
            {title}
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={!checklist}
          onClick={copyChecklist}
        >
          <Copy data-icon="inline-start" aria-hidden="true" />
          Copy checklist
        </Button>
      </header>

      {isGroup ? (
        <div className="flex flex-col gap-2">
          <p
            id={caseLabelId}
            className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"
          >
            Visitor&apos;s case
          </p>
          {overview ? (
            <ToggleGroup
              aria-labelledby={caseLabelId}
              value={[pickedCase]}
              onValueChange={(values: string[]) => {
                // Pressing the active chip would clear the group; a case is always chosen.
                const next = values[0];
                if (next) setPickedCase(next);
              }}
              variant="chips"
              className="w-full"
            >
              <ToggleGroupItem value={ALL_CASES}>All cases</ToggleGroupItem>
              {cases.map((item) => (
                <ToggleGroupItem
                  key={item.service_code}
                  value={item.service_code}
                >
                  {caseLabel(item)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : (
            <Skeleton className="h-9 w-full max-w-md rounded-full" />
          )}
        </div>
      ) : null}

      <FactsStrip
        facts={[
          {
            icon: Wallet,
            label: "Fee at cashier",
            value: fee,
            hint:
              breakdown ??
              (isGroup && !active
                ? "Pick a case for the exact amount"
                : "Paid at the CCRO cashier"),
          },
          {
            icon: Clock,
            label: "Time at the office",
            value: summarizeWait(time),
            hint: time,
          },
          {
            icon: Files,
            label: "Documents to bring",
            value: checklist?.required.length ?? service.requirement_count,
            hint:
              checklist && checklist.conditional.length > 0
                ? `+ ${checklist.conditional.length} only if it applies`
                : "Every document is required",
          },
        ]}
      />

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 rounded-[10px]" />
          ))}
        </div>
      ) : error ? (
        <ChecklistLoadError error={error} retry={retry} />
      ) : checklist ? (
        <div className="flex flex-col gap-5">
          <p role="status" className="sr-only">
            {checklist.required.length}{" "}
            {checklist.required.length === 1 ? "document" : "documents"} to bring
            {active && isGroup ? ` for ${caseLabel(active)}` : ""}.
          </p>
          <RequiredDocuments requirements={checklist.required} />
          <ConditionalDocuments requirements={checklist.conditional} />
          {steps.length > 0 ? (
            <OfficeSteps steps={steps} />
          ) : isGroup ? (
            <p className="text-xs text-body">
              The steps and the fee break down differently for each case. Pick
              a case to see them.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
