import { PageHeaderCard } from "~/components/ui/page-header-card";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { formatCount, pluralize } from "~/features/admin/reports/report-summary";
import {
  REPORT_PERIODS,
  isReportPeriodMonths,
  type ReportPeriodMonths,
} from "~/features/admin/reports/service-report";

interface ReportsHeaderProps {
  months: ReportPeriodMonths;
  /** Every request received in the period. */
  requests: number;
  /** "Nov 1, 2025 – Oct 23, 2026" */
  periodLabel: string;
  onMonthsChange: (months: ReportPeriodMonths) => void;
}

/**
 * The page's title card, in the shape of the Services, Staff and Request Queue
 * headers. The reporting period sits in it as a row of choices, all visible at
 * once, since it decides every figure below.
 */
export function ReportsHeader({
  months,
  requests,
  periodLabel,
  onMonthsChange,
}: ReportsHeaderProps) {
  return (
    <PageHeaderCard
      title="Reports"
      description={`CCRO Administration, ${formatCount(requests)} ${pluralize(requests, "request")}, ${periodLabel}`}
    >
      <ToggleGroup
        aria-label="Reporting period"
        value={[String(months)]}
        onValueChange={(values: string[]) => {
          // base-ui returns every active value, so the new one is the last. An
          // empty list means the active choice was pressed again: keep it.
          const next = Number(values[values.length - 1]);
          if (isReportPeriodMonths(next)) onMonthsChange(next);
        }}
        variant="pill"
        size="lg"
        className="flex-wrap"
      >
        {REPORT_PERIODS.map((period) => (
          <ToggleGroupItem key={period.months} value={String(period.months)}>
            {period.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </PageHeaderCard>
  );
}
