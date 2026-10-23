import { FilterChips, TableSearch } from "~/components/ui/data-table-toolbar";
import { DatePicker } from "~/components/ui/date-picker";
import {
  officeTodayKey,
  type PaymentRange,
} from "~/features/requests/payment-history";

type RangePreset = "today" | "month" | "custom";

function presetRanges(): Record<Exclude<RangePreset, "custom">, PaymentRange> {
  const today = officeTodayKey();
  return {
    today: { from: today, to: today },
    month: { from: `${today.slice(0, 8)}01`, to: today },
  };
}

function activePreset(range: PaymentRange): RangePreset {
  const presets = presetRanges();
  if (range.from === presets.today.from && range.to === presets.today.to) return "today";
  if (range.from === presets.month.from && range.to === presets.month.to) return "month";
  return "custom";
}

interface PaymentHistoryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  range: PaymentRange;
  onRangeChange: (range: PaymentRange) => void;
}

export function PaymentHistoryToolbar({
  search,
  onSearchChange,
  range,
  onRangeChange,
}: PaymentHistoryToolbarProps) {
  const today = officeTodayKey();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <TableSearch
        value={search}
        onChange={onSearchChange}
        placeholder="Search by tracking number, applicant, service or OR no…"
        label="Search payments"
      />

      <FilterChips<RangePreset>
        label="Filter by period"
        value={activePreset(range)}
        onValueChange={(preset) => {
          if (preset !== "custom") onRangeChange(presetRanges()[preset]);
        }}
        options={[
          { value: "today", label: "Today" },
          { value: "month", label: "This month" },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
        <label htmlFor="payments-from" className="text-xs font-medium text-muted-foreground">
          From
        </label>
        <DatePicker
          id="payments-from"
          className="h-10 w-40"
          value={range.from}
          onValueChange={(from) => onRangeChange({ from, to: range.to })}
          max={range.to}
          clearable={false}
        />
        <label htmlFor="payments-to" className="text-xs font-medium text-muted-foreground">
          To
        </label>
        <DatePicker
          id="payments-to"
          className="h-10 w-40"
          value={range.to}
          onValueChange={(to) => onRangeChange({ from: range.from, to })}
          min={range.from}
          max={today}
          clearable={false}
        />
      </div>
    </div>
  );
}
