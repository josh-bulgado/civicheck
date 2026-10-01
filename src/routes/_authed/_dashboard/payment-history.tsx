import { createFileRoute, redirect } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { getPaymentHistoryFn } from "~/features/requests/requests.queries";
import { normalizePaymentRange } from "~/features/requests/payment-history";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import PaymentHistoryPage from "~/features/requests/pages/PaymentHistoryPage";

export const Route = createFileRoute("/_authed/_dashboard/payment-history")({
  // The range lives in the URL so a report view is a shareable link and the
  // back button restores the previous one. Absent or invalid → today.
  validateSearch: (search: Record<string, unknown>) => ({
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_payments"))
      throw redirect({ to: "/dashboard" });
  },
  loaderDeps: ({ search }) => normalizePaymentRange(search.from, search.to),
  loader: async ({ deps }) => ({
    range: deps,
    payments: await getPaymentHistoryFn({ data: deps }),
  }),
  staleTime: 30_000,
  component: PaymentHistoryRoute,
});

function PaymentHistoryRoute() {
  const { range, payments } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  useRealtimeRefresh({ tables: ["application_logs", "requests"] });

  return (
    <PaymentHistoryPage
      payments={payments}
      range={range}
      onRangeChange={(next) => navigate({ search: next })}
    />
  );
}
