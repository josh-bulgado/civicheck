import {
  createFileRoute,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { getServiceDetail } from "~/features/services/services.queries";
import {
  redirectToServiceSlug,
  toServiceSlug,
} from "~/features/services/service-slug";
import { discardRequestUploadDraftFn } from "~/features/apply/apply.mutations";
import { ApplicationDocket } from "~/features/apply/components/ApplicationDocket";
import { ApplyStepRail } from "~/features/apply/components/ApplyStepRail";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";

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
  beforeLoad: ({ params, location }) => {
    redirectToServiceSlug(location, "/apply/", params.serviceCode);
  },
  loader: ({ params }) => getServiceDetail({ data: params.serviceCode }),
  // Stepping back and forth through case → details → documents → review
  // re-runs this loader; the service definition can't change mid-application.
  staleTime: 5 * 60_000,
  component: ApplyLayout,
});

const STEP_PATHS = ["case", "details", "documents", "review"] as const;

function ApplyLayout() {
  const { routeCode, displayName, isGroup, services } = Route.useLoaderData();
  const { draft, clear, hydrated } = useApplyDraft(routeCode);
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
    clear();
    if (uploadDraftId) {
      discardRequestUploadDraftFn({ data: { uploadDraftId } }).catch(() => {});
    }
  }

  return (
    <div className="apply-wizard min-h-screen bg-ground">
      <ApplyStepRail
        currentStep={currentStep}
        draftUpdatedAt={hydrated ? draft.updatedAt : null}
      />

      {/* The progress rail scrolls away with the page; the selected service
          and fee stay pinned. Below `md` it scrolls too, since a stacked band
          would take too much of a phone screen. Portaled popovers and dialogs
          sit at z-50, above this. */}
      <div className="z-30 md:sticky md:top-0">
        <ApplicationDocket
          serviceName={serviceName}
          serviceFamily={serviceFamily}
          fee={selectedService?.fee}
          copies={draft.copies}
          feePerCopy={selectedService?.fee_per_copy === true}
          selectionPending={selectionPending}
          onDiscard={handleDiscard}
        />
      </div>

      <Outlet />
    </div>
  );
}
