import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { TERMINAL_STATUSES } from "~/features/requests/request-workflow";
import { ActiveRequestsPanel } from "../components/ActiveRequestsPanel";
import { AttentionPanel } from "../components/AttentionPanel";
import { DashboardHero } from "../components/DashboardHero";
import { QuickStartPanel } from "../components/QuickStartPanel";
import { StatGrid } from "../components/StatGrid";
import type { AttentionItem, CitizenDashboardRequest } from "../types";

interface CitizenDashboardProps {
  requests: CitizenDashboardRequest[];
  firstName: string;
}

const CitizenDashboard = ({ requests, firstName }: CitizenDashboardProps) => {
  const realtimeStatus = useRealtimeRefresh({ tables: ["requests"] });

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
      message: "Missing requirements — resubmit so validation can continue.",
      action: "Upload docs",
    })),
    ...paymentDue.map((request) => ({
      request,
      tone: "success" as const,
      message: `₱${Number(request.fees_due ?? 0).toFixed(2)} due — pay and claim at the CCRO cashier.`,
      action: "View details",
    })),
  ];

  if (requests.length === 0) {
    return (
      <div className="dashboard-page max-w-7xl">
        <DashboardHero
          firstName={firstName}
          greeting="Welcome"
          subhead="Let's find out what you need. Pick a document below to see its checklist, then submit your request when you're ready."
        />
        <QuickStartPanel prominent />
      </div>
    );
  }

  return (
    <div className="dashboard-page max-w-7xl">
      <DashboardHero
        firstName={firstName}
        greeting="Welcome back"
        subhead={attentionSubhead(readyForRelease.length, incomplete.length)}
      />

      <StatGrid
        total={requests.length}
        inProgress={activeRequests.length}
        readyForRelease={readyForRelease.length}
        paymentDue={paymentDue.length}
      />

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <AttentionPanel items={attentionItems} />
        <QuickStartPanel />
      </div>

      <ActiveRequestsPanel
        requests={activeRequests}
        realtimeStatus={realtimeStatus}
      />
    </div>
  );
};

export default CitizenDashboard;

function attentionSubhead(readyCount: number, incompleteCount: number) {
  if (readyCount > 0 && incompleteCount > 0) {
    return `You have ${readyCount} request${readyCount === 1 ? "" : "s"} ready for release and ${incompleteCount} that need${incompleteCount === 1 ? "s" : ""} your attention before ${incompleteCount === 1 ? "it" : "they"} can move forward.`;
  }
  if (readyCount > 0) {
    return `You have ${readyCount} request${readyCount === 1 ? "" : "s"} ready for release — pay and claim ${readyCount === 1 ? "it" : "them"} at the CCRO cashier.`;
  }
  if (incompleteCount > 0) {
    return `${incompleteCount} request${incompleteCount === 1 ? "" : "s"} need${incompleteCount === 1 ? "s" : ""} your attention before ${incompleteCount === 1 ? "it can" : "they can"} move forward.`;
  }
  return "Track the status of your submitted civil registry requests in real time.";
}
