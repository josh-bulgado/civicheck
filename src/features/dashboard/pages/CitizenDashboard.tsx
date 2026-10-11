import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { TERMINAL_STATUSES } from "~/features/requests/request-workflow";
import { useWelcomeTutorialAutoOpen } from "~/features/onboarding/components/WelcomeTutorial";
import { ActiveRequestsPanel } from "../components/ActiveRequestsPanel";
import { AttentionPanel } from "../components/AttentionPanel";
import { QuickStartPanel } from "../components/QuickStartPanel";
import type { AttentionItem, CitizenDashboardRequest } from "../types";

interface CitizenDashboardProps {
  requests: CitizenDashboardRequest[];
  welcomeTutorialSeen: boolean;
}

const CitizenDashboard = ({ requests, welcomeTutorialSeen }: CitizenDashboardProps) => {
  // Keeps the page moving with the request; nothing on screen announces it.
  useRealtimeRefresh({ tables: ["requests"] });
  useWelcomeTutorialAutoOpen({ hasRequests: requests.length > 0, seen: welcomeTutorialSeen });

  const activeRequests = requests.filter(
    (request) => !(TERMINAL_STATUSES as string[]).includes(request.status),
  );
  const readyForRelease = requests.filter((r) => r.status === "ready_for_release");
  const paymentDue = requests.filter(
    (r) => r.status === "ready_for_release" && r.payment_status !== "verified",
  );
  const incomplete = requests.filter((r) => r.status === "incomplete");

  const attentionItems: AttentionItem[] = [
    ...incomplete.map((request) => ({
      request,
      tone: "warning" as const,
      message: "Missing requirements. Resubmit so validation can continue.",
      action: "Upload docs",
    })),
    ...paymentDue.map((request) => ({
      request,
      tone: "success" as const,
      message: `₱${Number(request.fees_due ?? 0).toFixed(2)} due. Pay and claim at the CCRO cashier.`,
      action: "View details",
    })),
  ];

  if (requests.length === 0) {
    return (
      <div className="portal-page">
        <QuickStartPanel prominent />
      </div>
    );
  }

  return (
    <div className="portal-page">
      <ActiveRequestsPanel
        requests={activeRequests}
        readyForRelease={readyForRelease.length}
        paymentDue={paymentDue.length}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-4">
        <AttentionPanel items={attentionItems} />
        <QuickStartPanel />
      </div>
    </div>
  );
};

export default CitizenDashboard;
