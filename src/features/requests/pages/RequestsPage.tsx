import type { Department } from "~/features/admin/departments.queries";
import type { StaffRequestRow } from "../requests.queries";
import type { RequestQueueFilters } from "../request-queue";
import type { EncodableService } from "../walk-in-intake.queries";
import { RequestsPageHeader } from "../components/RequestsPageHeader";
import { RequestsStatsCards } from "../components/RequestsStatsCards";
import { RequestsTableSection } from "../components/RequestsTableSection";

interface RequestsPageProps {
  requests: StaffRequestRow[];
  departments: Department[];
  filters: RequestQueueFilters;
  onFiltersChange: (filters: RequestQueueFilters) => void;
  /** Set when the viewer is department-scoped (staff/supervisor). */
  scopedDepartmentName?: string | null;
  /** Set when the viewer can encode walk-ins; null hides the action. */
  encodableServices?: EncodableService[] | null;
  onWalkInEncoded?: () => void;
}

const RequestsPage = ({
  requests,
  departments,
  filters,
  onFiltersChange,
  scopedDepartmentName,
  encodableServices,
  onWalkInEncoded,
}: RequestsPageProps) => {
  return (
    <div className="dashboard-page animate-in fade-in duration-300">
      <RequestsPageHeader
        departmentName={scopedDepartmentName}
        encodableServices={encodableServices}
        onWalkInEncoded={onWalkInEncoded}
      />
      <RequestsStatsCards data={requests} />
      <RequestsTableSection
        requests={requests}
        departments={departments}
        filters={filters}
        onFiltersChange={onFiltersChange}
        scopedDepartmentName={scopedDepartmentName}
      />
    </div>
  );
};

export default RequestsPage;
