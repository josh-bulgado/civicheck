import { createFileRoute } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import { CashierCounter } from "~/features/cashier/components/CashierCounter";
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
  component: CashierPage,
});

function CashierPage() {
  const { tracking } = Route.useSearch();
  return (
    <div className="dashboard-page max-w-3xl">
      <header className="dashboard-hero">
        <div className="relative z-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            Counter operations
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            Cashier Counter
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Look up a request by tracking number to confirm the fee due and record payment.
          </p>
        </div>
      </header>

      <div className="mt-8">
        <CashierCounter initialTracking={tracking} />
      </div>
    </div>
  );
}
