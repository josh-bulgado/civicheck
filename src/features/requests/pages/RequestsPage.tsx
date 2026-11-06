import { useEffect, useState } from "react";
import type { Department } from "~/features/admin/departments.queries";
import type { RequestQueuePage } from "../requests.queries";
import type { RequestQueueFilters } from "../request-queue";
import type { EncodableService } from "../walk-in-intake.queries";
import { RequestsDataTable } from "../components/RequestsDataTable";
import { RequestsPageHeader } from "../components/RequestsPageHeader";

interface RequestsPageProps {
  queue: RequestQueuePage;
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
  queue,
  departments,
  filters,
  onFiltersChange,
  scopedDepartmentName,
  encodableServices,
  onWalkInEncoded,
}: RequestsPageProps) => {
  // Shared so the header's QR scan can fill the search box beside the table.
  const [search, setSearch] = useState(filters.search ?? "");

  useEffect(() => setSearch(filters.search ?? ""), [filters.search]);
  useEffect(() => {
    if (search === (filters.search ?? "")) return;
    const timeout = window.setTimeout(
      () =>
        onFiltersChange({
          ...filters,
          search: search || undefined,
          page: undefined,
        }),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [filters, onFiltersChange, search]);

  return (
    <div className="dashboard-page">
      <RequestsPageHeader
        departmentName={scopedDepartmentName}
        requestCount={queue.requestCount}
        waitingCount={queue.waitingCount}
        encodableServices={encodableServices}
        onWalkInEncoded={onWalkInEncoded}
        onScan={setSearch}
      />
      <RequestsDataTable
        queue={queue}
        departments={departments}
        filters={filters}
        onFiltersChange={onFiltersChange}
        search={search}
        onSearchChange={setSearch}
        scopedDepartmentName={scopedDepartmentName}
      />
    </div>
  );
};

export default RequestsPage;
