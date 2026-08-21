import {
  createFileRoute,
  redirect,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { AdminReportsSkeleton } from "~/features/admin/reports/components/AdminReportsSkeleton";
import { getCcroAdminReports } from "~/features/admin/reports/reports.queries";
import { AdminReportsPage } from "~/features/admin/reports/pages/AdminReportsPage";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/_dashboard/admin/reports")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "dashboard:admin")
    ) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getCcroAdminReports(),
  staleTime: 30_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: AdminReportsSkeleton,
  errorComponent: AdminReportsError,
  component: AdminReportsRoute,
});

function AdminReportsRoute() {
  const data = Route.useLoaderData();
  useRealtimeRefresh({ tables: ["requests", "application_logs"] });
  return <AdminReportsPage data={data} />;
}

function AdminReportsError({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <div className="dashboard-page max-w-3xl">
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Could Not Load Operational Reports</AlertTitle>
        <AlertDescription>
          {error.message || "The latest report metrics are temporarily unavailable."}
        </AlertDescription>
      </Alert>
      <Button onClick={() => router.invalidate()}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        Try Again
      </Button>
    </div>
  );
}
