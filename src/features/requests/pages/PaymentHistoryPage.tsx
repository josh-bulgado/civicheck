import { Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Field, FieldLabel } from "~/components/ui/field";
import { formatDateKey } from "~/lib/date";
import type { PaymentHistoryRow } from "~/features/requests/requests.queries";
import { PaymentHistoryDataTable } from "~/features/requests/components/PaymentHistoryDataTable";
import { formatPeso } from "~/features/requests/components/PaymentHistoryColumn";
import {
  officeTodayKey,
  paymentsToCsv,
  type PaymentRange,
} from "~/features/requests/payment-history";

interface PaymentHistoryPageProps {
  payments: PaymentHistoryRow[];
  range: PaymentRange;
  onRangeChange: (range: PaymentRange) => void;
}

function describeRange({ from, to }: PaymentRange) {
  return from === to
    ? formatDateKey(from)
    : `${formatDateKey(from)} – ${formatDateKey(to)}`;
}

function downloadCsv(payments: PaymentHistoryRow[], { from, to }: PaymentRange) {
  const blob = new Blob([paymentsToCsv(payments)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `payments-${from}${from === to ? "" : `-to-${to}`}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function PaymentHistoryPage({
  payments,
  range,
  onRangeChange,
}: PaymentHistoryPageProps) {
  const total = payments.reduce((sum, payment) => sum + payment.feesDue, 0);
  const today = officeTodayKey();
  const monthStart = `${today.slice(0, 8)}01`;

  return (
    <div className="dashboard-page">
      <header className="dashboard-hero">
        <div className="relative z-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            Counter operations
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            Payment History
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Payments verified by the cashier, for reconciling against the cashiering ledger.
          </p>
        </div>
      </header>

      <section className="dashboard-panel mt-8 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Verified Payments</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {describeRange(range)} · {payments.length} payment
              {payments.length === 1 ? "" : "s"} · {formatPeso(total)} verified
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-44">
              <FieldLabel htmlFor="payments-from">From</FieldLabel>
              <DatePicker
                id="payments-from"
                value={range.from}
                onValueChange={(from) => onRangeChange({ from, to: range.to })}
                max={range.to}
                clearable={false}
              />
            </Field>
            <Field className="w-44">
              <FieldLabel htmlFor="payments-to">To</FieldLabel>
              <DatePicker
                id="payments-to"
                value={range.to}
                onValueChange={(to) => onRangeChange({ from: range.from, to })}
                min={range.from}
                max={today}
                clearable={false}
              />
            </Field>
            <Button
              variant="outline"
              onClick={() => onRangeChange({ from: today, to: today })}
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={() => onRangeChange({ from: monthStart, to: today })}
            >
              This month
            </Button>
            <Button
              disabled={payments.length === 0}
              onClick={() => downloadCsv(payments, range)}
            >
              <Download data-icon="inline-start" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <PaymentHistoryDataTable data={payments} />
        </div>
      </section>
    </div>
  );
}
