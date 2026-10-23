import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Department } from "~/features/admin/departments.queries";
import { BriefingTab } from "~/features/admin/reports/components/BriefingTab";
import { ReportsHeader } from "~/features/admin/reports/components/ReportsHeader";
import { ServicesTab } from "~/features/admin/reports/components/ServicesTab";
import { SheetTab } from "~/features/admin/reports/components/SheetTab";
import { formatGeneratedAt } from "~/features/admin/reports/report-summary";
import {
  isReportView,
  type ReportView,
  type RequestVolumeData,
  type ServiceReportData,
} from "~/features/admin/reports/reports.types";
import type { ReportPeriodMonths } from "~/features/admin/reports/service-report";

interface AdminReportsPageProps {
  volume: RequestVolumeData;
  report: ServiceReportData;
  departments: ReadonlyArray<Department>;
  view: ReportView;
  onViewChange: (view: ReportView) => void;
  onMonthsChange: (months: ReportPeriodMonths) => void;
  onSelectService: (key: string) => void;
}

/**
 * The Reports page: one header with the reporting period, and three views of
 * the same figures. The briefing answers "how are we doing" in plain words, the
 * services view lets an administrator dig into one service, and the sheet turns
 * the lot into a page to print.
 */
export function AdminReportsPage({
  volume,
  report,
  departments,
  view,
  onViewChange,
  onMonthsChange,
  onSelectService,
}: AdminReportsPageProps) {
  const months = report.period.months as ReportPeriodMonths;

  return (
    <div className="dashboard-page">
      <ReportsHeader
        months={months}
        requests={report.totals.requests}
        periodLabel={report.period.label}
        onMonthsChange={onMonthsChange}
      />

      <Tabs
        value={view}
        onValueChange={(next) => {
          if (isReportView(next)) onViewChange(next);
        }}
      >
        <TabsList variant="glide" aria-label="Report views">
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="sheet">Report Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="briefing" className="pt-4">
          <BriefingTab
            volume={volume}
            report={report}
            months={months}
            onViewServices={() => onViewChange("services")}
          />
        </TabsContent>
        <TabsContent value="services" className="pt-4">
          <ServicesTab
            report={report}
            departments={departments}
            onSelectService={onSelectService}
          />
        </TabsContent>
        <TabsContent value="sheet" className="pt-4">
          <SheetTab volume={volume} report={report} />
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        Generated from live request and workflow activity at{" "}
        <time dateTime={report.generatedAt}>{formatGeneratedAt(report.generatedAt)}</time>.
      </p>
    </div>
  );
}
