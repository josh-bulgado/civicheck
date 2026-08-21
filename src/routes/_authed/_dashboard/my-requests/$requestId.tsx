import { createFileRoute, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getMyRequestDetailFn } from "~/features/requests/applicant-requests.queries";
import MyRequestDetailPage from "~/features/requests/pages/MyRequestDetailPage";
import { MyRequestDetailPageSkeleton } from "~/features/requests/pages/MyRequestDetailPageSkeleton";

export const Route = createFileRoute("/_authed/_dashboard/my-requests/$requestId")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own"))
      throw new Error("Forbidden");
  },
  loader: ({ params }) => getMyRequestDetailFn({ data: { requestId: params.requestId } }),
  staleTime: 30_000,
  pendingMs: 250,
  pendingMinMs: 250,
  pendingComponent: MyRequestDetailPageSkeleton,
  component: MyRequestDetailRoute,
});

function MyRequestDetailRoute() {
  const request = Route.useLoaderData();
  const router = useRouter();
  useRealtimeRefresh({
    tables: ["requests", "application_logs", "requirements_attachments"],
  });

  return <MyRequestDetailPage request={request} onUpdated={() => router.invalidate()} />;
}
