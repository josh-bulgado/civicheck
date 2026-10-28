import { useEffect, useState } from "react";
import {
  createFileRoute,
  Outlet,
  redirect,
  useMatches,
} from "@tanstack/react-router";
import { hasPermission } from "~/lib/permissions";
import { getServiceDetail } from "~/features/services/services.queries";
import {
  redirectToServiceSlug,
  toServiceSlug,
} from "~/features/services/service-slug";
import { discardRequestUploadDraftFn } from "~/features/apply/apply.mutations";
import { ApplicationDocket } from "~/features/apply/components/ApplicationDocket";
import { ApplyStepRail } from "~/features/apply/components/ApplyStepRail";
import { KeepDraftDialog } from "~/features/apply/components/KeepDraftDialog";
import { WizardPageSkeleton } from "~/features/apply/components/WizardPageSkeleton";
import { draftHasProgress, useApplyDraft } from "~/features/apply/hooks/useApplyDraft";

// The session + active-account check now lives on the parent `/_authed`
// layer, shared with the dashboard shell — this route only needs its own
// service-detail loader.
export const Route = createFileRoute("/_authed/apply/$serviceCode")({
  // Links and navigations pass the registry code ("MARRIAGE_LICENSE"); the
  // address bar shows its slug ("marriage-license"). The loader maps the slug
  // back, so nothing outside this route has to know the URL form.
  params: {
    stringify: ({ serviceCode }) => ({
      serviceCode: toServiceSlug(serviceCode),
    }),
  },
  beforeLoad: ({ context, params, location }) => {
    // Only applicants file online requests; the server functions refuse
    // anyone else, so personnel are sent back rather than shown a dead form.
    if (!context.user || !hasPermission(context.user.role, "requests:create")) {
      throw redirect({ to: "/dashboard" });
    }
    redirectToServiceSlug(location, "/apply/", params.serviceCode);
  },
  loader: ({ params }) => getServiceDetail({ data: params.serviceCode }),
  // Stepping back and forth through case → details → documents → review
  // re-runs this loader; the service definition can't change mid-application.
  staleTime: 5 * 60_000,
  // A bar and the page's own shapes while the service loads, held back for 200ms
  // so a quick load never flashes them.
  pendingMs: 200,
  pendingMinMs: 300,
  pendingComponent: WizardPageSkeleton,
  component: ApplyLayout,
});

const STEP_PATHS = ["case", "details", "documents", "review"] as const;

function ApplyLayout() {
  const { routeCode, displayName, isGroup, services } = Route.useLoaderData();
  const { draft, update, discard, hydrated } = useApplyDraft(routeCode);
  // The CiviCheck mark in the rail leads to the dashboard; with something to
  // lose, it asks what to do with the draft first.
  const [leavingToDashboard, setLeavingToDashboard] = useState(false);
  const hasProgress = hydrated && draftHasProgress(draft);

  // Remember what this application is called, so the dashboard can offer to
  // continue it by name. Only once the draft holds something: a cleared draft
  // (after submitting, or discarding) must not be written back to life.
  useEffect(() => {
    if (hydrated && draft.updatedAt !== null && draft.serviceName !== displayName) {
      update({ serviceName: displayName });
    }
  }, [hydrated, draft.updatedAt, draft.serviceName, displayName, update]);

  const matches = useMatches();
  const activePath = matches[matches.length - 1]?.routeId.split("/").pop();
  const stepIndex = STEP_PATHS.indexOf(activePath as (typeof STEP_PATHS)[number]);
  const currentStep = ((stepIndex === -1 ? 0 : stepIndex) + 1) as 1 | 2 | 3 | 4;

  const selectedService = draft.selectedServiceCode
    ? services.find(
        (service) => service.service_code === draft.selectedServiceCode,
      )
    : isGroup
      ? undefined
      : services[0];
  const serviceName = selectedService?.name ?? displayName;
  const serviceFamily =
    selectedService && selectedService.name !== displayName
      ? displayName
      : undefined;
  const selectionPending = isGroup && !selectedService;

  function handleDiscard() {
    const uploadDraftId = draft.uploadDraftId;
    discard();
    if (uploadDraftId) {
      discardRequestUploadDraftFn({ data: { uploadDraftId } }).catch(() => {});
    }
  }

  return (
    <div className="apply-wizard apply-wizard-ground min-h-screen">
      <ApplyStepRail
        currentStep={currentStep}
        draftUpdatedAt={hydrated ? draft.updatedAt : null}
        onLeave={hasProgress ? () => setLeavingToDashboard(true) : undefined}
      />
      <KeepDraftDialog
        open={leavingToDashboard}
        onOpenChange={setLeavingToDashboard}
        serviceName={serviceName}
        destination="/dashboard"
        onDiscard={handleDiscard}
      />

      {/* The progress rail scrolls away with the page; the selected service
          and fee stay pinned. Below `md` it scrolls too, since a stacked band
          would take too much of a phone screen. The band is a card on the
          ground, so while pinned it carries the ground's own gradient (fixed,
          so it lines up) and the page slides under it cleanly. Portaled
          popovers and dialogs sit at z-50, above this. */}
      <div className="z-30 md:sticky md:top-0 md:bg-(image:--portal-ground) md:bg-fixed md:py-1.5">
        <ApplicationDocket
          serviceName={serviceName}
          serviceFamily={serviceFamily}
          fee={selectedService?.fee}
          feeComponents={selectedService?.fee_components}
          copies={draft.copies}
          feePerCopy={selectedService?.fee_per_copy === true}
          selectionPending={selectionPending}
          hasProgress={hasProgress}
          onDiscard={handleDiscard}
        />
      </div>

      <Outlet />
    </div>
  );
}
