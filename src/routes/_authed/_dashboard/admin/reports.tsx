import { useCallback } from "react";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { getActiveDepartments } from "~/features/admin/departments.queries";
import { AdminReportsSkeleton } from "~/features/admin/reports/components/AdminReportsSkeleton";
import { getCcroRequestVolume } from "~/features/admin/reports/reports.queries";
import {
  DEFAULT_REPORT_VIEW,
  isReportView,
  type ReportView,
} from "~/features/admin/reports/reports.types";
import { getCcroServiceReport } from "~/features/admin/reports/service-report.queries";
import {
  DEFAULT_REPORT_MONTHS,
  isReportPeriodMonths,
  type ReportPeriodMonths,
} from "~/features/admin/reports/service-report";
import { AdminReportsPage } from "~/features/admin/reports/pages/AdminReportsPage";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/admin/reports")({
  // Filter state lives in the URL so a report view is a shareable link and the
  // back button restores the previous one.
  validateSearch: (search: Record<string, unknown>) => ({
    months: isReportPeriodMonths(search.months)
      ? Number(search.months)
      : DEFAULT_REPORT_MONTHS,
    service: typeof search.service === "string" ? search.service : undefined,
    view: isReportView(search.view) ? search.view : DEFAULT_REPORT_VIEW,
  }),
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "dashboard:admin")
    ) {
      denyAccess(location);
    }
  },
  // Only what the data depends on. Moving between the briefing and the sheet
  // reads the same figures, so it must not reload them, and a chosen service
  // only matters on the Services view: elsewhere the report profiles the
  // busiest service.
  loaderDeps: ({ search }) => ({
    months: search.months,
    service: search.view === "services" ? search.service : undefined,
  }),
  loader: async ({ deps }) => {
    // The request volume, the service report and the department names are
    // independent reads.
    const [volume, report, departments] = await Promise.all([
      getCcroRequestVolume({ data: { months: deps.months } }),
      getCcroServiceReport({ data: deps }),
      getActiveDepartments(),
    ]);
    return { volume, report, departments };
  },
  staleTime: 30_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: AdminReportsSkeleton,
  errorComponent: AdminReportsError,
  component: AdminReportsRoute,
});

function AdminReportsRoute() {
  const { volume, report, departments } = Route.useLoaderData();
  const { view } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  useRealtimeRefresh({ tables: ["requests", "application_logs"] });

  // Stable, so the ledger's columns are not rebuilt on every render.
  const onViewChange = useCallback(
    (next: ReportView) => navigate({ search: (current) => ({ ...current, view: next }) }),
    [navigate],
  );
  // A service chosen for one period may not exist in another.
  const onMonthsChange = useCallback(
    (months: ReportPeriodMonths) =>
      navigate({ search: (current) => ({ ...current, months, service: undefined }) }),
    [navigate],
  );
  const onSelectService = useCallback(
    (service: string) => navigate({ search: (current) => ({ ...current, service }) }),
    [navigate],
  );

  return (
    <AdminReportsPage
      volume={volume}
      report={report}
      departments={departments}
      view={view}
      onViewChange={onViewChange}
      onMonthsChange={onMonthsChange}
      onSelectService={onSelectService}
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
          {(error instanceof Error && error.message) ||
            "The latest report metrics are temporarily unavailable."}
        </AlertDescription>
      </Alert>
      <Button onClick={() => router.invalidate()}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        Try Again
      </Button>
    </div>
  );
}
