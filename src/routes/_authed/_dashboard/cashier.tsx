import { createFileRoute } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { CashierCounterPage } from "~/features/cashier/components/CashierCounterPage";
import {
  getAwaitingPaymentCountFn,
  getPaymentHistoryFn,
} from "~/features/requests/requests.queries";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { denyAccess } from "~/lib/access";

export const Route = createFileRoute("/_authed/_dashboard/cashier")({
  beforeLoad: ({ context, location }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:collect_payment"))
      denyAccess(location);
  },
  // A notification links here with the request's tracking number pre-filled.
  validateSearch: (search: Record<string, unknown>): { tracking?: string } => {
    const tracking = typeof search.tracking === "string" ? search.tracking.trim() : "";
    return tracking ? { tracking } : {};
  },
  // No range means today: the tape is the day's payments, and the awaiting
  // count is what is ready for release and still unpaid.
  loader: async () => {
    const [payments, awaitingCount] = await Promise.all([
      getPaymentHistoryFn({ data: {} }),
      getAwaitingPaymentCountFn(),
    ]);
    return { payments, awaitingCount };
  },
  staleTime: 30_000,
  component: CashierPage,
});

function CashierPage() {
  const { tracking } = Route.useSearch();
  const { payments, awaitingCount } = Route.useLoaderData();
  // Another cashier's payment, or a request reaching Ready for Release, updates the tape.
  useRealtimeRefresh({ tables: ["application_logs", "requests"] });

  return (
    <CashierCounterPage
      initialTracking={tracking}
      payments={payments}
      awaitingCount={awaitingCount}
    />
  );
}
