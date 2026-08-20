import { createFileRoute } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { getMyRequestsFn } from "~/features/requests/applicant-requests.queries";
import MyRequestsPage from "~/features/requests/pages/MyRequestsPage";

export const Route = createFileRoute("/_authed/my-requests/")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own")) throw new Error("Forbidden");
  },
  loader: () => getMyRequestsFn(),
  staleTime: 30_000,
  component: MyRequestsRoute,
});

function MyRequestsRoute() {
  const requests = Route.useLoaderData();
  // The applicant's own status tracker — this is the "no polling-by-phone-call"
  // promise, so it has to move the moment staff advance the request.
  useRealtimeRefresh({ tables: ["requests"] });

  return <MyRequestsPage requests={requests} />;
}
