import { AttentionQueue } from "../components/AttentionQueue";
import { DashboardHeader } from "../components/DashboardHeader";
import { DashboardSummary } from "../components/DashboardSummary";
import { PersonnelPanel } from "../components/PersonnelPanel";
import { PipelinePanel } from "../components/PipelinePanel";
import { RecentRequestsPanel } from "../components/RecentRequestsPanel";
import { ServiceDemandPanel } from "../components/ServiceDemandPanel";
import type { AdminDashboardData } from "../dashboard.types";

export default function AdminDashboardPage({
  data,
}: {
  data: AdminDashboardData;
}) {
  return (
    <main className="dashboard-page">
      <DashboardHeader generatedAt={data.generatedAt} />
      <DashboardSummary counts={data.counts} generatedAt={data.generatedAt} />
      <PipelinePanel pipeline={data.pipeline} />
      <AttentionQueue
        attentionItems={data.attentionItems}
        generatedAt={data.generatedAt}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <ServiceDemandPanel serviceDemand={data.serviceDemand} />
        <PersonnelPanel personnel={data.personnel} />
      </div>
      <RecentRequestsPanel recentRequests={data.recentRequests} />
    </main>
  );
}
