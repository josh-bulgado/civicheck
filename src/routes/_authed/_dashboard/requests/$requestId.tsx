import { createFileRoute, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getRequestDetailFn } from "~/features/requests/requests.queries";
import RequestDetailPage from "~/features/requests/pages/RequestDetailPage";

export const Route = createFileRoute("/_authed/_dashboard/requests/$requestId")({
  beforeLoad: ({ context }) => {
    if (
      !context.user ||
      !hasPermission(context.user.role as Role, "requests:view_all")
    )
      throw new Error("Forbidden");
  },
  loader: ({ params }) =>
    getRequestDetailFn({ data: { requestId: params.requestId } }),
  staleTime: 30_000,
  component: RequestDetailRoute,
});

function RequestDetailRoute() {
  const request = Route.useLoaderData();
  const router = useRouter();
  useRealtimeRefresh({
    tables: ["requests", "application_logs", "requirements_attachments"],
  });

  return <RequestDetailPage request={request} onUpdated={() => router.invalidate()} />;
}
