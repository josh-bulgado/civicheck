import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useResetApplyChoices } from "~/features/apply/hooks/useApplyDraft";
import { ConfirmApplyDialog } from "~/features/services/components/ConfirmApplyDialog";
import { PortalRequirementsDialog } from "~/features/services/components/PortalRequirementsDialog";
import { ServiceRequirementsDialog } from "~/features/services/components/ServiceRequirementsDialog";
import {
  formatPesoFee,
  getVisitBadge,
  isFullyOnline,
  portalWait,
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
  /** A short card title an admin may have set. */
  short_name?: string | null;
  steps_description: string[] | null;
  requirement_count: number;
}

export interface ServiceEntryBadge {
  label: string;
  tone: "success" | "warning" | "info";
}

export const badgeToneClasses = {
  success: "bg-tone-success-soft text-tone-success",
  warning: "bg-tone-warning-soft text-tone-warning",
  info: "bg-tone-review-soft text-tone-review",
} as const;

/**
 * Everything a service entry needs to render and act, minus the markup.
 *
 * The checklist popup and the apply confirmation are identical in both
 * densities, and so is the back-out behaviour between them, so the state lives
 * here rather than being written twice. Pair the returned object with
 * `<ServiceEntryDialogs entry={...} />` to mount the dialogs themselves.
 *
 * `startOnChecklist` opens the checklist as soon as the entry mounts, for a
 * service the applicant arrived at from a search hit rather than by clicking
 * its card.
 */
export function useServiceEntry(
  service: ServiceEntryProps,
  canApply = true,
  startOnChecklist = false,
) {
  const navigate = useNavigate();
  const resetApplyChoices = useResetApplyChoices();
  const [requirementsOpen, setRequirementsOpen] = useState(startOnChecklist);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Applying from inside the checklist popup closes it. If the applicant backs
  // out of the confirmation, put them back where they were instead of dropping
  // them on the directory.
  const [confirmFromChecklist, setConfirmFromChecklist] = useState(false);

  const routeCode = service.display_group ?? service.service_code;
  const title = service.display_name ?? service.name;
  // What a card calls it. The full name is for the dialogs, where there is room.
  const shortTitle = service.short_name || title;
  const fullyOnline = isFullyOnline(service.steps_description);
  const visitBadge = getVisitBadge(service.processing_time);
  const feeLabel = formatPesoFee(service.fee, service.display_group);
  // Off the label, not the number: a grouped service reads "Varies" whatever
  // its representative fee is, and only a real "Free" earns the success tone.
  const isFree = feeLabel === "Free";

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

  // From the confirmation: read the checklist before deciding. It is the
  // checklist that then offers Apply again, so back-out never loops.
  function checkRequirementsFirst() {
    setConfirmFromChecklist(false);
    setConfirmOpen(false);
    setRequirementsOpen(true);
  }

  function confirmApply() {
    // Clear the flag first, so closing the confirmation on the way out doesn't
    // reopen the checklist behind the apply flow.
    setConfirmFromChecklist(false);
    setConfirmOpen(false);
    resetApplyChoices(routeCode);
    navigate({
      to: "/apply/$serviceCode/case",
      params: { serviceCode: routeCode },
    });
  }

  return {
    service,
    routeCode,
    title,
    shortTitle,
    isFree,
    badge,
    requirementLabel:
      service.requirement_count === 1
        ? "1 requirement"
        : `${service.requirement_count} requirements`,
    /** "Answered in" for the email service, "Released" for counter services. */
    waitTerm: fullyOnline ? "Answered in" : "Released",
    waitLabel: summarizeWait(service.processing_time),
    /** The wait in the applicant portal's wording: always working days. */
    portalWaitLabel: portalWait(service.processing_time),
    feeLabel,
    canApply,
    openRequirements: () => setRequirementsOpen(true),
    startApply: () => askToApply(false),

    // Dialog wiring — consumed by `ServiceEntryDialogs`, not by the layouts.
    requirementsOpen,
    setRequirementsOpen,
    applyFromChecklist: () => askToApply(true),
    confirmOpen,
    handleConfirmOpenChange,
    checkRequirementsFirst,
    confirmApply,
  };
}

export type ServiceEntry = ReturnType<typeof useServiceEntry>;

/**
 * The checklist popup and apply confirmation shared by both densities.
 * `variant="portal"` is the applicant directory's restyled checklist; staff
 * keep the plain reference one.
 */
export function ServiceEntryDialogs({
  entry,
  variant = "dashboard",
  onChecklistClose,
}: {
  entry: ServiceEntry;
  variant?: "dashboard" | "portal";
  /**
   * The applicant closed the checklist themselves. Not called when Apply takes
   * it down on the way to the confirmation, nor when backing out of that
   * brings it back.
   */
  onChecklistClose?: () => void;
}) {
  const Checklist =
    variant === "portal" ? PortalRequirementsDialog : ServiceRequirementsDialog;

  return (
    <>
      <Checklist
        serviceCode={entry.routeCode}
        title={entry.title}
        fee={entry.service.fee}
        displayGroup={entry.service.display_group}
        processingTime={entry.service.processing_time}
        open={entry.requirementsOpen}
        onOpenChange={(open) => {
          entry.setRequirementsOpen(open);
          if (!open) onChecklistClose?.();
        }}
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
          onCheckRequirements={entry.checkRequirementsFirst}
        />
      )}
    </>
  );
}
