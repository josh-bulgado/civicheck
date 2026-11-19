import { createRoot } from "react-dom/client";
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { QuietLink } from "~/components/quiet-link";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import { CatalogPageSkeleton, EditorPageSkeleton, TablePageSkeleton } from "~/components/feedback/PageSkeleton";
import { PortalNotificationsHeader } from "~/features/notifications/components/PortalNotificationsHeader";
import { NotificationsPageSkeleton } from "~/features/notifications/pages/NotificationsPageSkeleton";
import { MyRequestsPageHeader } from "~/features/requests/components/MyRequestsPageHeader";
import { MyRequestsPageSkeleton } from "~/features/requests/pages/MyRequestsPageSkeleton";
import { MyRequestDetailPageSkeleton } from "~/features/requests/pages/MyRequestDetailPageSkeleton";
import { RequestsPageSkeleton } from "~/features/requests/pages/RequestsPageSkeleton";
import { StaffDashboardSkeleton } from "~/features/dashboard/StaffDashboardSkeleton";
import { CitizenDashboardSkeleton } from "~/features/dashboard/CitizenDashboardSkeleton";
import { AdminOverviewSkeleton } from "~/features/admin/overview/components/AdminOverviewSkeleton";
import { AdminReportsSkeleton } from "~/features/admin/reports/components/AdminReportsSkeleton";
import { CashierCounterSkeleton } from "~/features/cashier/components/CashierCounterSkeleton";
import { SystemHealthSkeleton } from "~/features/system-admin/components/SystemHealthSkeleton";
import { SecurityCenterSkeleton } from "~/features/system-admin/components/SecurityCenterSkeleton";
import { LoginPageSkeleton } from "~/features/auth/components/LoginPageSkeleton";
import { LandingPageSkeleton } from "~/features/landing/components/LandingPageSkeleton";
import { WizardPageSkeleton } from "~/features/apply/components/WizardPageSkeleton";
import "~/styles/app.css";
import "~/features/landing/landing.css";
import "~/features/system-admin/system-health.css";
import "~/features/system-admin/security-center.css";

const showcase = new URLSearchParams(location.search).get("showcase");
const samples: Record<string, () => React.ReactNode> = {
  notifications: () => <NotificationsPageSkeleton audience="applicant" />,
  staffNotifications: () => <NotificationsPageSkeleton audience="staff" />,
  requests: () => <MyRequestsPageSkeleton />,
  detail: () => <MyRequestDetailPageSkeleton />,
  queue: () => <RequestsPageSkeleton />,
  catalog: () => <CatalogPageSkeleton />,
  staffCatalog: () => <CatalogPageSkeleton audience="staff" />,
  dashboard: () => <CitizenDashboardSkeleton />,
  staffDashboard: () => <StaffDashboardSkeleton />,
  overview: () => <AdminOverviewSkeleton />,
  reports: () => <AdminReportsSkeleton />,
  cashier: () => <CashierCounterSkeleton />,
  health: () => <SystemHealthSkeleton />,
  security: () => <SecurityCenterSkeleton />,
  login: () => <LoginPageSkeleton />,
  landing: () => <LandingPageSkeleton />,
  wizard: () => <WizardPageSkeleton />,
  editor: () => <EditorPageSkeleton title="New service" />,
};

const rootRoute = createRootRoute({ component: () => (
  showcase ? <main className="min-h-screen bg-background p-5 md:p-12">{samples[showcase]?.()}</main> : (
    <div className="min-h-screen bg-background p-5 md:p-12">
      <nav aria-label="Preview navigation" className="mb-8 flex flex-wrap gap-6">
        <QuietLink to="/notifications">Notifications</QuietLink>
        <QuietLink to="/my-requests">My requests</QuietLink>
        <QuietLink to="/admin/services">Services registry</QuietLink>
      </nav>
      <main><Outlet /></main>
    </div>
  )
) });

function deferredRead(path: string) {
  return new Promise<null>((resolve) => {
    const release = (event: Event) => {
      if (event instanceof CustomEvent && event.detail === path) {
        window.removeEventListener("release-loading", release);
        resolve(null);
      }
    };
    window.addEventListener("release-loading", release);
  });
}

const home = createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => <h1>Choose a page</h1> });
const notifications = createRoute({
  getParentRoute: () => rootRoute, path: "notifications",
  loader: () => deferredRead("notifications"), pendingMs: 0, pendingMinMs: 0, staleTime: Infinity,
  pendingComponent: () => <NotificationsPageSkeleton audience="applicant" />,
  component: () => <div className="portal-page gap-4.5 md:gap-7"><PortalNotificationsHeader /><p>Fetched notification</p></div>,
});
const requests = createRoute({
  getParentRoute: () => rootRoute, path: "my-requests",
  loader: () => deferredRead("requests"), pendingMs: 0, pendingMinMs: 0, staleTime: Infinity,
  pendingComponent: MyRequestsPageSkeleton,
  component: () => <div className="portal-page gap-4.5 md:gap-7"><MyRequestsPageHeader /><p>Fetched request</p></div>,
});
const services = createRoute({
  getParentRoute: () => rootRoute, path: "admin/services",
  loader: () => deferredRead("services"), pendingMs: 0, pendingMinMs: 0, staleTime: Infinity,
  pendingComponent: () => <TablePageSkeleton title="Services" label="Loading services" columnLabels={["Service", "Department", "Class", "Fee", "Actions"]} />,
  component: () => <div className="dashboard-page"><PageHeaderCard title="Services" description="3 services" /><p>Fetched services</p></div>,
});
const router = createRouter({ routeTree: rootRoute.addChildren([home, notifications, requests, services]) });
createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
