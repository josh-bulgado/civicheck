import { createFileRoute, Outlet, redirect, useMatches } from "@tanstack/react-router";
import { getServiceDetail } from "~/features/services/services.queries";
import { ApplyStepRail } from "~/features/apply/components/ApplyStepRail";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";

export const Route = createFileRoute("/apply/$serviceCode")({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  loader: ({ params }) => getServiceDetail({ data: params.serviceCode }),
  component: ApplyLayout,
});

const STEP_PATHS = ["details", "case", "documents", "review"] as const;

function ApplyLayout() {
  const { serviceCode } = Route.useParams();
  const { displayName } = Route.useLoaderData();
  const { draft, hydrated } = useApplyDraft(serviceCode);
  const matches = useMatches();
  const activePath = matches[matches.length - 1]?.routeId.split("/").pop();
  const stepIndex = STEP_PATHS.indexOf(activePath as (typeof STEP_PATHS)[number]);
  const currentStep = ((stepIndex === -1 ? 0 : stepIndex) + 1) as 1 | 2 | 3 | 4;

  return (
    <div className="min-h-screen bg-background">
      <ApplyStepRail
        currentStep={currentStep}
        serviceName={displayName}
        draftUpdatedAt={hydrated ? draft.updatedAt : null}
      />
      <Outlet />
    </div>
  );
}
