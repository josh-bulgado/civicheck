import type { getCcroAdminReports } from "~/features/admin/reports/reports.queries";

export type AdminReportsData = Awaited<ReturnType<typeof getCcroAdminReports>>;
