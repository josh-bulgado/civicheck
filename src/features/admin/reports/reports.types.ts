import type { getCcroAdminReports } from "~/features/admin/reports/reports.queries";

export type AdminReportsData = Awaited<ReturnType<typeof getCcroAdminReports>>;

export type { ServiceReportData } from "~/features/admin/reports/service-report.queries";
