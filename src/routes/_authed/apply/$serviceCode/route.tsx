import { useState } from "react";
import {
  createFileRoute,
  Outlet,
  useMatches,
  useNavigate,
} from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { getServiceDetail } from "~/features/services/services.queries";
import { ApplyStepRail } from "~/features/apply/components/ApplyStepRail";
import { LeaveApplicationDialog } from "~/features/apply/components/LeaveApplicationDialog";
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
  const { displayName } = Route.useLoaderData();
  const { draft, clear, hydrated } = useApplyDraft(serviceCode);
  const navigate = useNavigate();
  const matches = useMatches();
  const activePath = matches[matches.length - 1]?.routeId.split("/").pop();
  const stepIndex = STEP_PATHS.indexOf(activePath as (typeof STEP_PATHS)[number]);
  const currentStep = ((stepIndex === -1 ? 0 : stepIndex) + 1) as 1 | 2 | 3 | 4;

  const [leaveOpen, setLeaveOpen] = useState(false);

  function leaveToServices() {
    navigate({ to: "/services" });
  }

  function handleBack() {
    setLeaveOpen(true);
  }

  function discardAndExit() {
    clear();
    setLeaveOpen(false);
    leaveToServices();
  }

  function saveAndExit() {
    // The draft is already written to localStorage on every edit, so saving is
    // just leaving it in place.
    setLeaveOpen(false);
    leaveToServices();
  }

  return (
    <div className="min-h-screen bg-background">
      <ApplyStepRail
        currentStep={currentStep}
        serviceName={displayName}
        draftUpdatedAt={hydrated ? draft.updatedAt : null}
      />

      {/* Below the rail, aligned with the wizard card. Shown on every step. */}
      <div className="mx-auto w-full max-w-350 px-5 pt-6 sm:px-8">
        <button
          type="button"
          onClick={handleBack}
          className="civic-press group inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-control-border bg-white px-2.5 text-sm font-bold text-foreground outline-none hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Back to services
        </button>
      </div>

      <Outlet />

      <LeaveApplicationDialog
        serviceName={displayName}
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        onSaveAndExit={saveAndExit}
        onDiscard={discardAndExit}
      />
    </div>
  );
}
