import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { AdminReportsSkeleton } from "~/features/admin/reports/components/AdminReportsSkeleton";
import { getCcroAdminReports } from "~/features/admin/reports/reports.queries";
import { getCcroServiceReport } from "~/features/admin/reports/service-report.queries";
import {
  DEFAULT_REPORT_MONTHS,
  isReportPeriodMonths,
} from "~/features/admin/reports/service-report";
import { AdminReportsPage } from "~/features/admin/reports/pages/AdminReportsPage";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/_dashboard/admin/reports")({
  // Filter state lives in the URL so a report view is a shareable link and the
  // back button restores the previous one.
  validateSearch: (search: Record<string, unknown>) => ({
    months: isReportPeriodMonths(search.months)
      ? Number(search.months)
      : DEFAULT_REPORT_MONTHS,
    service: typeof search.service === "string" ? search.service : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "dashboard:admin")
    ) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    // The office-wide cards and the service report are independent reads.
    const [reports, serviceReport] = await Promise.all([
      getCcroAdminReports(),
      getCcroServiceReport({ data: deps }),
    ]);
    return { reports, serviceReport };
  },
  staleTime: 30_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: AdminReportsSkeleton,
  errorComponent: AdminReportsError,
  component: AdminReportsRoute,
});

function AdminReportsRoute() {
  const { reports, serviceReport } = Route.useLoaderData();
  const navigate = useNavigate({ from: Route.fullPath });
  useRealtimeRefresh({ tables: ["requests", "application_logs"] });

  return (
    <AdminReportsPage
      data={reports}
      serviceReport={serviceReport}
      onFilterChange={(next) =>
        navigate({ search: (current) => ({ ...current, ...next }) })
      }
    />
  );
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
