import {
  createFileRoute,
  redirect,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { AdminOverviewSkeleton } from "~/features/admin/overview/components/AdminOverviewSkeleton";
import { getCcroAdminOverview } from "~/features/admin/overview/overview.queries";
import { AdminOverviewPage } from "~/features/admin/overview/pages/AdminOverviewPage";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";

export const Route = createFileRoute("/_authed/admin/")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "dashboard:admin")
    ) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getCcroAdminOverview(),
  staleTime: 15_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: AdminOverviewSkeleton,
  errorComponent: AdminOverviewError,
  component: AdminOverviewRoute,
});

function AdminOverviewRoute() {
  const data = Route.useLoaderData();
  useRealtimeRefresh({
    tables: ["requests", "application_logs"],
  });
  return <AdminOverviewPage data={data} />;
}

function AdminOverviewError({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <div className="dashboard-page max-w-3xl">
      <Alert variant="destructive">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Could Not Load the Operations Overview</AlertTitle>
        <AlertDescription>
          {error.message || "The latest office metrics are temporarily unavailable."}
        </AlertDescription>
      </Alert>
      <Button onClick={() => router.invalidate()}>
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
        Try Again
      </Button>
    </div>
  );
}
