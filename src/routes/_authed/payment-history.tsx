import { createFileRoute } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { getPaymentHistoryFn } from "~/features/requests/requests.queries";

export const Route = createFileRoute("/_authed/payment-history")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:collect_payment"))
      throw new Error("Forbidden");
  },
  loader: () => getPaymentHistoryFn(),
  component: PaymentHistoryPage,
});

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PaymentHistoryPage() {
  const payments = Route.useLoaderData();

  return (
    <div className="dashboard-page max-w-5xl">
      <header className="dashboard-hero">
        <div className="relative z-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            Counter operations
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            Payment History
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Payments verified today, for reconciling against the cashiering ledger.
          </p>
        </div>
      </header>

      <div className="mt-8 rounded-xl border border-border bg-white">
        {payments.length === 0 ? (
          <p className="p-8 text-center text-sm italic text-muted-foreground">
            No payments verified yet today.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>OR #</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead>Verified at</TableHead>
                  <TableHead>Verified by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.trackingNumber}</TableCell>
                    <TableCell>{p.applicantName}</TableCell>
                    <TableCell>{p.serviceName}</TableCell>
                    <TableCell>{p.orNumber ?? "—"}</TableCell>
                    <TableCell className="text-right">₱{p.feesDue.toFixed(2)}</TableCell>
                    <TableCell>{formatTime(p.verifiedAt)}</TableCell>
                    <TableCell>{p.verifiedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
