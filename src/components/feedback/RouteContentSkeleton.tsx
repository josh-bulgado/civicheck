import { useRouterState } from "@tanstack/react-router";
import { peekCurrentUser } from "~/features/auth/current-user";
import { CitizenDashboardSkeleton } from "~/features/dashboard/CitizenDashboardSkeleton";
import { StaffDashboardSkeleton } from "~/features/dashboard/StaffDashboardSkeleton";
import { AdminOverviewSkeleton } from "~/features/admin/overview/components/AdminOverviewSkeleton";
import { AdminReportsSkeleton } from "~/features/admin/reports/components/AdminReportsSkeleton";
import { CashierCounterSkeleton } from "~/features/cashier/components/CashierCounterSkeleton";
import { NotificationsPageSkeleton } from "~/features/notifications/pages/NotificationsPageSkeleton";
import { MyRequestsPageSkeleton } from "~/features/requests/pages/MyRequestsPageSkeleton";
import { MyRequestDetailPageSkeleton } from "~/features/requests/pages/MyRequestDetailPageSkeleton";
import { RequestsPageSkeleton } from "~/features/requests/pages/RequestsPageSkeleton";
import { RequestDetailPageSkeleton } from "~/features/requests/pages/RequestDetailPageSkeleton";
import { CatalogPageSkeleton, EditorPageSkeleton, PageSkeleton, TablePageSkeleton } from "./PageSkeleton";

/** Parent loading and lazy-shell fallbacks keep the destination's fixed copy. */
export function RouteContentSkeleton() {
  const pathname = useRouterState({ select: (state) => state.location.pathname.replace(/\/$/, "") || "/" });
  if (pathname === "/my-requests") return <MyRequestsPageSkeleton />;
  if (pathname.startsWith("/my-requests/")) return <MyRequestDetailPageSkeleton />;
  if (pathname === "/notifications") return <NotificationsPageSkeleton audience={peekCurrentUser()?.role === "applicant" ? "applicant" : "staff"} />;
  if (pathname === "/dashboard" && peekCurrentUser()?.role === "applicant") return <CitizenDashboardSkeleton />;
  if (pathname === "/staff-dashboard") return <StaffDashboardSkeleton />;
  if (pathname === "/admin") return <AdminOverviewSkeleton />;
  if (pathname === "/admin/reports") return <AdminReportsSkeleton />;
  if (pathname === "/cashier") return <CashierCounterSkeleton />;
  if (pathname === "/services") return <CatalogPageSkeleton audience={peekCurrentUser()?.role === "applicant" ? "applicant" : "staff"} />;
  if (pathname === "/requests") return <RequestsPageSkeleton />;
  if (pathname.startsWith("/requests/")) return <RequestDetailPageSkeleton />;
  if (pathname === "/payment-history") return <TablePageSkeleton title="Payment History" label="Loading payment history" />;
  if (pathname === "/admin/services/new") return <EditorPageSkeleton title="New service" />;
  if (/^\/admin\/services\/[^/]+\/edit$/.test(pathname)) return <EditorPageSkeleton />;
  if (pathname === "/admin/services/blocks") return <PageSkeleton title="Shared question blocks" label="Loading shared form blocks" />;
  if (pathname === "/admin/services") return <TablePageSkeleton title="Services" description="CCRO Administration" label="Loading services registry" columns={5} />;
  if (pathname === "/admin/staff") return <TablePageSkeleton title="Staff Management" description="CCRO Administration" label="Loading personnel" avatar />;
  if (pathname === "/admin/feedback") return <TablePageSkeleton title="Feedback & Reports" label="Loading feedback and reports" />;
  if (pathname === "/system-admin/accounts") return <TablePageSkeleton title="Accounts Center" label="Loading accounts" avatar />;
  if (pathname === "/system-admin/audit") return <TablePageSkeleton title="Audit Center" label="Loading audit events" />;
  return <PageSkeleton />;
}
