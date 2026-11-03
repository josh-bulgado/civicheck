import { useMemo } from "react";
import { LayoutGrid } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ServiceInsightPanel } from "~/features/admin/reports/components/ServiceInsightPanel";
import { ServiceLedger } from "~/features/admin/reports/components/ServiceLedger";
import type { Department } from "~/features/admin/departments.queries";
import type { ServiceReportData } from "~/features/admin/reports/reports.types";

interface ServicesTabProps {
  report: ServiceReportData;
  departments: ReadonlyArray<Department>;
  onSelectService: (key: string) => void;
}

/**
 * Every service on one table, with the selected service's patterns beside it.
 * On a laptop or a big screen the two sit side by side, so picking another row
 * never loses the table; on a narrow screen the patterns follow the table.
 */
export function ServicesTab({ report, departments, onSelectService }: ServicesTabProps) {
  const { services, selectedService, insight } = report;

  const departmentName = useMemo(() => {
    const names = new Map(departments.map(({ id, name }) => [id, name]));
    return (id: string | null) => (id ? (names.get(id) ?? id) : "Unassigned");
  }, [departments]);

  if (services.length === 0) {
    return (
      <Alert className="civic-enter-sm">
        <LayoutGrid aria-hidden="true" />
        <AlertTitle>No Requests in This Period</AlertTitle>
        <AlertDescription>
          Per-service figures appear once requests have been submitted. Try a longer
          reporting period.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <ServiceLedger
        rows={services}
        departments={departments}
        selectedKey={selectedService?.key ?? null}
        onSelect={onSelectService}
        months={report.period.months}
      />
      <ServiceInsightPanel
        service={selectedService}
        insight={insight}
        departmentName={departmentName(selectedService?.departmentId ?? null)}
      />
    </div>
  );
}
