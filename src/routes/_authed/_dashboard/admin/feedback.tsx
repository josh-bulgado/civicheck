import { useCallback } from "react";
import {
  createFileRoute,
  useNavigate,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { TablePageSkeleton } from "~/components/feedback/PageSkeleton";
import { AdminFeedbackPage } from "~/features/feedback/components/AdminFeedbackPage";
import { getAdminFeedbackFn } from "~/features/feedback/feedback.functions";
import {
  reviewFiltersSchema,
  type ReviewFilters,
} from "~/features/feedback/feedback";
import { hasPermission, type Role } from "~/lib/permissions";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/admin/feedback")({
  validateSearch: (search: Record<string, unknown>) => {
    const result = reviewFiltersSchema.safeParse({
      ...search,
      page: Number(search.page ?? 1),
    });
    return result.success ? result.data : reviewFiltersSchema.parse({});
  },
  beforeLoad: ({ context, location }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "dashboard:admin")
    )
      denyAccess(location);
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getAdminFeedbackFn({ data: deps }),
  staleTime: 0,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: () => <TablePageSkeleton title="Feedback & Reports" label="Loading feedback and reports" columnLabels={["Request / report", "Service", "Response", "Submitted", "Status", "Review"]} />,
  errorComponent: FeedbackError,
  component: FeedbackRoute,
});

function FeedbackRoute() {
  const data = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const onFiltersChange = useCallback(
    (next: Partial<ReviewFilters>) => {
      void navigate({ search: (current) => ({ ...current, ...next }) });
    },
    [navigate],
  );
  return (
    <AdminFeedbackPage
      data={data}
      filters={filters}
      onFiltersChange={onFiltersChange}
      onUpdated={() => {
        void router.invalidate();
      }}
    />
  );
}

function FeedbackError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="dashboard-page">
      <Alert variant="destructive">
        <AlertTitle>Could not load feedback and reports</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Please try again."}
        </AlertDescription>
      </Alert>
      <Button onClick={() => router.invalidate()}>Try again</Button>
    </div>
  );
}
