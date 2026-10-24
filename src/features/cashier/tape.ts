import type { PaymentHistoryRow } from "~/features/requests/requests.queries";

/** How many of today's payments the tape lists. The Payment History page has the rest. */
export const TAPE_ROWS = 8;

export interface TapeSummary {
  count: number;
  /** What the verified payments add up to, in pesos. */
  total: number;
}

export function summarizeTape(payments: Pick<PaymentHistoryRow, "feesDue">[]): TapeSummary {
  return {
    count: payments.length,
    total: payments.reduce((sum, payment) => sum + payment.feesDue, 0),
  };
}

/** The payments the tape lists, newest first (the history query already sorts them that way). */
export function tapeRows<T>(payments: T[]): T[] {
  return payments.slice(0, TAPE_ROWS);
}

/** Moves the tape's highlighted row by one, staying inside the list. -1 means no row is highlighted. */
export function stepTapeSelection(current: number, direction: 1 | -1, rowCount: number): number {
  if (rowCount === 0) return -1;
  if (current < 0) return direction === 1 ? 0 : rowCount - 1;
  return Math.min(rowCount - 1, Math.max(0, current + direction));
}
