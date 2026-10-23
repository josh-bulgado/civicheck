export type { RequestVolumeData } from "~/features/admin/reports/reports.queries";
export type { ServiceReportData } from "~/features/admin/reports/service-report.queries";

/** The three views of the Reports page. The URL holds the active one. */
export const REPORT_VIEWS = ["briefing", "services", "sheet"] as const;
export type ReportView = (typeof REPORT_VIEWS)[number];
export const DEFAULT_REPORT_VIEW: ReportView = "briefing";

export function isReportView(value: unknown): value is ReportView {
  return (REPORT_VIEWS as readonly unknown[]).includes(value);
}
