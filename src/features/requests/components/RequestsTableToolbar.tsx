import { Building2, Search } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Department } from "~/features/admin/departments.queries";
import { STAGE_LABELS, type WorkflowStage } from "../request-workflow";
import {
  STAGES,
  UNASSIGNED_DEPARTMENT_FILTER,
  parseWorkflowStage,
} from "../request-queue";

export const ALL_DEPARTMENTS = "all";

interface RequestsTableToolbarProps {
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  stage: WorkflowStage | undefined;
  onStageChange: (stage: WorkflowStage | undefined) => void;
  stageCounts: Record<"all" | WorkflowStage, number>;
  departments: Department[];
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  /** Staff/supervisor only ever see one department — show it, not a picker. */
  scopedDepartmentName?: string | null;
}

export function RequestsTableToolbar({
  globalFilter,
  onGlobalFilterChange,
  stage,
  onStageChange,
  stageCounts,
  departments,
  departmentFilter,
  onDepartmentFilterChange,
  scopedDepartmentName,
}: RequestsTableToolbarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by tracking number, applicant, or service..."
            value={globalFilter}
            onChange={(e) => onGlobalFilterChange(e.target.value)}
            className="h-10 rounded-lg border-border pl-10 text-sm focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Department:</span>
          </div>
          {scopedDepartmentName ? (
            <Badge variant="neutral" className="h-10 px-3 text-sm font-semibold">
              {scopedDepartmentName}
            </Badge>
          ) : (
            <Select
              value={departmentFilter}
              onValueChange={(value) =>
                onDepartmentFilterChange(value ?? ALL_DEPARTMENTS)
              }
            >
              <SelectTrigger
                id="requests-department-filter"
                className="h-10 w-48"
                aria-label="Filter by department"
              >
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={UNASSIGNED_DEPARTMENT_FILTER}>
                    Unassigned
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Tabs
        value={stage ? String(stage) : "all"}
        onValueChange={(value) =>
          onStageChange(
            value === "all" ? undefined : parseWorkflowStage(Number(value)),
          )
        }
        className="min-w-0"
      >
        <TabsList variant="accent" className="max-w-full overflow-x-auto">
          <TabsTrigger value="all">
            All
            <Badge
              variant="secondary"
              className={cn(
                "ml-2",
                !stage && "bg-white/20 text-primary-foreground",
              )}
            >
              {stageCounts.all}
            </Badge>
          </TabsTrigger>
          {STAGES.map((workflowStage) => (
            <TabsTrigger key={workflowStage} value={String(workflowStage)}>
              {STAGE_LABELS[workflowStage]}
              {stageCounts[workflowStage] > 0 && (
                <Badge
                  variant="info"
                  className={cn(
                    "ml-2",
                    stage === workflowStage &&
                      "bg-white/20 text-primary-foreground ring-0",
                  )}
                >
                  {stageCounts[workflowStage]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
