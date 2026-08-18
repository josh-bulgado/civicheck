import type { getCcroAdminOverview } from "~/features/admin/overview/overview.queries";

export type AdminOverviewData = Awaited<
  ReturnType<typeof getCcroAdminOverview>
>;

export type RequestOverview = AdminOverviewData["requests"];
