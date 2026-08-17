import { useMemo } from "react";
import type { Department } from "~/features/admin/departments.queries";
import type { WorkflowStage } from "../request-workflow";
import type { StaffRequestRow } from "../requests.queries";
import {
  EMPTY_FILTERS,
  STAGES,
  isInStage,
  type RequestQueueFilters,
} from "../request-queue";
import { RequestsDataTable } from "./RequestsDataTable";
import { RequestsFocusedFilterAlert } from "./RequestsFocusedFilterAlert";
import { ALL_DEPARTMENTS } from "./RequestsTableToolbar";

interface RequestsTableSectionProps {
  requests: StaffRequestRow[];
  departments: Department[];
  filters: RequestQueueFilters;
  onFiltersChange: (filters: RequestQueueFilters) => void;
  scopedDepartmentName?: string | null;
}

export function RequestsTableSection({
  requests,
  departments,
  filters,
  onFiltersChange,
  scopedDepartmentName,
}: RequestsTableSectionProps) {
  const { stage, status, payment, department } = filters;

  // Stage tab counts always reflect the whole queue, so switching tabs never
  // makes a stage look emptier than it is.
  const stageCounts = useMemo(() => {
    const counts = { all: requests.length } as Record<"all" | WorkflowStage, number>;
    for (const workflowStage of STAGES) {
      counts[workflowStage] = requests.filter((request) =>
        isInStage(request.status, workflowStage),
      ).length;
    }
    return counts;
  }, [requests]);

  // URL-driven narrowing. Department is applied as a column filter inside the
  // data table; global search, sorting, and pagination live there too.
  const visible = useMemo(
    () =>
      requests.filter((request) => {
        if (stage && !isInStage(request.status, stage)) return false;
        if (status && request.status !== status) return false;
        if (payment === "unpaid" && request.paymentStatus === "verified")
          return false;
        return true;
      }),
    [requests, stage, status, payment],
  );

  return (
    <section className="dashboard-panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Office Request Pipeline</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select any request to review its requirements, history, and next
            workflow action.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <RequestsFocusedFilterAlert
          filters={filters}
          onClear={() => onFiltersChange(EMPTY_FILTERS)}
        />

        <RequestsDataTable
          data={visible}
          departments={departments}
          stage={stage}
          onStageChange={(nextStage) =>
            // Switching stage tabs drops the focused overview filter but keeps
            // the department the user picked.
            onFiltersChange({
              ...EMPTY_FILTERS,
              stage: nextStage,
              department,
            })
          }
          stageCounts={stageCounts}
          departmentFilter={department ?? ALL_DEPARTMENTS}
          onDepartmentFilterChange={(value) =>
            onFiltersChange({
              ...filters,
              department: value === ALL_DEPARTMENTS ? undefined : value,
            })
          }
          onClearFilters={() => onFiltersChange(EMPTY_FILTERS)}
          scopedDepartmentName={scopedDepartmentName}
        />
      </div>
    </section>
  );
}
