import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ConfirmApplyDialog } from "~/features/services/components/ConfirmApplyDialog";
import { ServiceRequirementsDialog } from "~/features/services/components/ServiceRequirementsDialog";
import {
  formatFee,
  getVisitBadge,
  isFullyOnline,
  summarizeWait,
} from "~/features/services/service-utils";

/**
 * One catalogue entry, as the directory renders it. The applicant picks the
 * density (compact cards or directory rows), so both presentations read the
 * same fields off the same service and drive the same two dialogs — only the
 * layout differs.
 */
export interface ServiceEntryProps {
  /** Carries the stagger index when the entry sits in a `.civic-stagger` list. */
  style?: React.CSSProperties;
  service_code: string;
  name: string;
  /** Nullable in `services_registry`; neither density renders it. */
  classification: string | null;
  fee: number | string;
  processing_time: string;
  display_group: string | null;
  display_name: string | null;
  steps_description: string[] | null;
  requirement_count: number;
}

export interface ServiceEntryBadge {
  label: string;
  tone: "success" | "warning" | "info";
}

export const badgeToneClasses = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-primary-soft text-primary",
} as const;

/**
 * Everything a service entry needs to render and act, minus the markup.
 *
 * The checklist popup and the apply confirmation are identical in both
 * densities, and so is the back-out behaviour between them, so the state lives
 * here rather than being written twice. Pair the returned object with
 * `<ServiceEntryDialogs entry={...} />` to mount the dialogs themselves.
 */
export function useServiceEntry(service: ServiceEntryProps, canApply = true) {
  const navigate = useNavigate();
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Applying from inside the checklist popup closes it. If the applicant backs
  // out of the confirmation, put them back where they were instead of dropping
  // them on the directory.
  const [confirmFromChecklist, setConfirmFromChecklist] = useState(false);

  const routeCode = service.display_group ?? service.service_code;
  const title = service.display_name ?? service.name;
  const fullyOnline = isFullyOnline(service.steps_description);
  const visitBadge = getVisitBadge(service.processing_time);
  const isFree = Number(service.fee) === 0;

  // Both densities have room for exactly one status chip beside the title.
  // "Fully online" is the more useful of the two when it applies, since a
  // service you never visit makes the visit count moot.
  const badge: ServiceEntryBadge = fullyOnline
    ? { label: "Fully online", tone: "info" }
    : visitBadge;

  function askToApply(fromChecklist: boolean) {
    setConfirmFromChecklist(fromChecklist);
    setRequirementsOpen(false);
    setConfirmOpen(true);
  }

  function handleConfirmOpenChange(open: boolean) {
    setConfirmOpen(open);
    if (!open && confirmFromChecklist) {
      setConfirmFromChecklist(false);
      setRequirementsOpen(true);
    }
  }

  function confirmApply() {
    // Clear the flag first, so closing the confirmation on the way out doesn't
    // reopen the checklist behind the apply flow.
    setConfirmFromChecklist(false);
    setConfirmOpen(false);
    navigate({
      to: "/apply/$serviceCode/case",
      params: { serviceCode: routeCode },
    });
  }

  return {
    service,
    routeCode,
    title,
    isFree,
    badge,
    requirementLabel:
      service.requirement_count === 1
        ? "1 requirement"
        : `${service.requirement_count} requirements`,
    /** "Answered in" for the email service, "Released" for counter services. */
    waitTerm: fullyOnline ? "Answered in" : "Released",
    waitLabel: summarizeWait(service.processing_time),
    feeLabel: formatFee(service.fee, service.display_group),
    canApply,
    openRequirements: () => setRequirementsOpen(true),
    startApply: () => askToApply(false),

    // Dialog wiring — consumed by `ServiceEntryDialogs`, not by the layouts.
    requirementsOpen,
    setRequirementsOpen,
    applyFromChecklist: () => askToApply(true),
    confirmOpen,
    handleConfirmOpenChange,
    confirmApply,
  };
}

export type ServiceEntry = ReturnType<typeof useServiceEntry>;

/** The checklist popup and apply confirmation shared by both densities. */
export function ServiceEntryDialogs({ entry }: { entry: ServiceEntry }) {
  return (
    <>
      <ServiceRequirementsDialog
        serviceCode={entry.routeCode}
        title={entry.title}
        fee={entry.service.fee}
        displayGroup={entry.service.display_group}
        processingTime={entry.service.processing_time}
        open={entry.requirementsOpen}
        onOpenChange={entry.setRequirementsOpen}
        onApply={entry.canApply ? entry.applyFromChecklist : undefined}
      />

      {entry.canApply && (
        <ConfirmApplyDialog
          title={entry.title}
          fee={entry.service.fee}
          displayGroup={entry.service.display_group}
          open={entry.confirmOpen}
          onOpenChange={entry.handleConfirmOpenChange}
          onConfirm={entry.confirmApply}
        />
      )}
    </>
  );
}
