import {
  createFileRoute,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { getServiceDetail } from "~/features/services/services.queries";
import { ApplicationDocket } from "~/features/apply/components/ApplicationDocket";
import { ApplyStepRail } from "~/features/apply/components/ApplyStepRail";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";

// The session + active-account check now lives on the parent `/_authed`
// layer, shared with the dashboard shell — this route only needs its own
// service-detail loader.
export const Route = createFileRoute("/_authed/apply/$serviceCode")({
  loader: ({ params }) => getServiceDetail({ data: params.serviceCode }),
  // Stepping back and forth through case → details → documents → review
  // re-runs this loader; the service definition can't change mid-application.
  staleTime: 5 * 60_000,
  component: ApplyLayout,
});

const STEP_PATHS = ["case", "details", "documents", "review"] as const;

function ApplyLayout() {
  const { serviceCode } = Route.useParams();
  const { displayName, isGroup, services } = Route.useLoaderData();
  const { draft, clear, hydrated } = useApplyDraft(serviceCode);
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

  return (
    <div className="min-h-screen bg-background">
      <ApplyStepRail
        currentStep={currentStep}
        draftUpdatedAt={hydrated ? draft.updatedAt : null}
      />

      <ApplicationDocket
        serviceName={serviceName}
        serviceFamily={serviceFamily}
        fee={selectedService?.fee}
        selectionPending={selectionPending}
        onDiscard={clear}
      />

      <Outlet />
    </div>
  );
}
