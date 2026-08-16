import { AttentionSection } from "~/features/admin/overview/components/AttentionSection";
import { CounterQueueCard } from "~/features/admin/overview/components/CounterQueueCard";
import { OverviewDocketHeader } from "~/features/admin/overview/components/OverviewDocketHeader";
import { RequestPipelineCard } from "~/features/admin/overview/components/RequestPipelineCard";
import type { AdminOverviewData } from "~/features/admin/overview/overview.types";

export function AdminOverviewPage({ data }: { data: AdminOverviewData }) {
  return (
    <div className="dashboard-page">
      <OverviewDocketHeader
        queueDate={data.queueDate}
        openRequests={data.requests.openTotal}
        citizensInQueue={data.queue.waiting + data.queue.active}
      />

      <AttentionSection
        incompleteRequests={data.requests.incomplete}
        unpaidReleaseRequests={data.requests.readyForReleaseUnpaid}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <RequestPipelineCard requests={data.requests} />
        <CounterQueueCard queue={data.queue} />
      </div>
    </div>
  );
}
