import { AttentionSection } from "~/features/admin/overview/components/AttentionSection";
import { OverviewDocketHeader } from "~/features/admin/overview/components/OverviewDocketHeader";
import { RequestPipelineCard } from "~/features/admin/overview/components/RequestPipelineCard";
import type { AdminOverviewData } from "~/features/admin/overview/overview.types";

export function AdminOverviewPage({ data }: { data: AdminOverviewData }) {
  return (
    <div className="dashboard-page">
      <OverviewDocketHeader
        officeDate={data.officeDate}
        openRequests={data.requests.openTotal}
        incompleteRequests={data.requests.incomplete}
      />

      <AttentionSection
        incompleteRequests={data.requests.incomplete}
        unpaidReleaseRequests={data.requests.readyForReleaseUnpaid}
      />

      <div className="grid gap-4">
        <RequestPipelineCard requests={data.requests} />
      </div>
    </div>
  );
}
