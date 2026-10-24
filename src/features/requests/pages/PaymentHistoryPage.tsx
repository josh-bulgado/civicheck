import { Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import { downloadCsv } from "~/lib/csv";
import { formatDateKey } from "~/lib/date";
import type { PaymentHistoryRow } from "~/features/requests/requests.queries";
import { PaymentHistoryDataTable } from "~/features/requests/components/PaymentHistoryDataTable";
import { formatPeso } from "~/lib/peso";
import { paymentsToCsv, type PaymentRange } from "~/features/requests/payment-history";

interface PaymentHistoryPageProps {
  payments: PaymentHistoryRow[];
  range: PaymentRange;
  /** Who is looking: the office for the admin, the counter for the cashier. */
  scopeLabel: string;
  onRangeChange: (range: PaymentRange) => void;
}

function describeRange({ from, to }: PaymentRange) {
  return from === to
    ? formatDateKey(from)
    : `${formatDateKey(from)} – ${formatDateKey(to)}`;
}

function exportPayments(payments: PaymentHistoryRow[], { from, to }: PaymentRange) {
  downloadCsv(
    paymentsToCsv(payments),
    `payments-${from}${from === to ? "" : `-to-${to}`}.csv`,
  );
}

export default function PaymentHistoryPage({
  payments,
  range,
  scopeLabel,
  onRangeChange,
}: PaymentHistoryPageProps) {
  const total = payments.reduce((sum, payment) => sum + payment.feesDue, 0);

  return (
    <div className="dashboard-page">
      <PageHeaderCard
        title="Payment History"
        description={`${scopeLabel}, ${describeRange(range)}, ${payments.length} ${
          payments.length === 1 ? "payment" : "payments"
        }, ${formatPeso(total)} verified`}
      >
        <Button
          variant="raised"
          size="lg"
          disabled={payments.length === 0}
          onClick={() => exportPayments(payments, range)}
        >
          <Download aria-hidden="true" data-icon="inline-start" />
          Export CSV
        </Button>
      </PageHeaderCard>
      <PaymentHistoryDataTable
        data={payments}
        range={range}
        onRangeChange={onRangeChange}
      />
    </div>
  );
}
