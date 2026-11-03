import { useMemo, useState } from "react";
import type { Department } from "~/features/admin/departments.queries";
import type { StaffRequestRow } from "../requests.queries";
import type { RequestQueueFilters } from "../request-queue";
import { countNeedingStaff } from "../requests-table.utils";
import type { EncodableService } from "../walk-in-intake.queries";
import { RequestsDataTable } from "../components/RequestsDataTable";
import { RequestsPageHeader } from "../components/RequestsPageHeader";

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
  /** The loader's clock, so every age reads the same on the server and in the browser. */
  now: number;
}

const RequestsPage = ({
  requests,
  departments,
  filters,
  onFiltersChange,
  scopedDepartmentName,
  encodableServices,
  onWalkInEncoded,
  now,
}: RequestsPageProps) => {
  // Shared so the header's QR scan can fill the search box beside the table.
  const [search, setSearch] = useState("");
  const waitingCount = useMemo(() => countNeedingStaff(requests), [requests]);

  return (
    <div className="dashboard-page">
      <RequestsPageHeader
        departmentName={scopedDepartmentName}
        requestCount={requests.length}
        waitingCount={waitingCount}
        encodableServices={encodableServices}
        onWalkInEncoded={onWalkInEncoded}
        onScan={setSearch}
      />
      <RequestsDataTable
        requests={requests}
        departments={departments}
        filters={filters}
        onFiltersChange={onFiltersChange}
        search={search}
        onSearchChange={setSearch}
        scopedDepartmentName={scopedDepartmentName}
        now={now}
      />
    </div>
  );
};

export default RequestsPage;
