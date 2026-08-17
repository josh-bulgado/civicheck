import type { Department } from "~/features/admin/departments.queries";
import type { StaffRequestRow } from "../requests.queries";
import type { RequestQueueFilters } from "../request-queue";
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
}

const RequestsPage = ({
  requests,
  departments,
  filters,
  onFiltersChange,
  scopedDepartmentName,
}: RequestsPageProps) => {
  return (
    <div className="dashboard-page animate-in fade-in duration-300">
      <RequestsPageHeader departmentName={scopedDepartmentName} />
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
