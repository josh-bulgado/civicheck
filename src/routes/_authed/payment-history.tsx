import { createFileRoute } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { getPaymentHistoryFn } from "~/features/requests/requests.queries";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import PaymentHistoryPage from "~/features/requests/pages/PaymentHistoryPage";

export const Route = createFileRoute("/_authed/payment-history")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:collect_payment"))
      throw new Error("Forbidden");
  },
  loader: () => getPaymentHistoryFn(),
  staleTime: 30_000,
  component: PaymentHistoryRoute,
});

function PaymentHistoryRoute() {
  const payments = Route.useLoaderData();
  useRealtimeRefresh({ tables: ["application_logs", "requests"] });

  return <PaymentHistoryPage payments={payments} />;
}
