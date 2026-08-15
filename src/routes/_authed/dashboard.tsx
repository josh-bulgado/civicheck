import { createFileRoute, redirect } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import AdminDashboardPage from "~/features/admin/dashboard/pages/AdminDashboardPage";
import { getAdminDashboard } from "~/features/admin/dashboard/dashboard.queries";
import { hasPermission } from "~/lib/permissions";
import type { Role } from "~/lib/permissions";

export const Route = createFileRoute("/_authed/dashboard")({
  beforeLoad: ({ context }) => {
    const role = (context.user?.role ?? "applicant") as Role;

    if (hasPermission(role, "dashboard:staff")) {
      throw redirect({ to: "/staff-dashboard" });
    }
    if (!hasPermission(role, "dashboard:admin")) {
      throw redirect({ to: "/services" });
    }
  },
  loader: () => getAdminDashboard(),
  component: RouteComponent,
  errorComponent: DashboardError,
});

function RouteComponent() {
  const data = Route.useLoaderData();
  return <AdminDashboardPage data={data} />;
}

function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="dashboard-panel mx-auto flex min-h-80 w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="text-xl font-bold">Dashboard unavailable</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        We couldn&apos;t load a complete operational snapshot. No partial data is being shown.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
      <button type="button" onClick={reset} className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover">
        Try again
      </button>
    </div>
  );
}
