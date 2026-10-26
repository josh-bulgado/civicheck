import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { FilterChips, TableSearch } from "~/components/ui/data-table-toolbar";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  officeTodayKey,
  type PaymentRange,
} from "~/features/requests/payment-history";

type RangePreset = "today" | "month" | "custom";

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function presetRanges(): Record<Exclude<RangePreset, "custom">, PaymentRange> {
  const today = officeTodayKey();
  return {
    today: { from: today, to: today },
    month: { from: `${today.slice(0, 8)}01`, to: today },
  };
}

function activePreset(range: PaymentRange): RangePreset {
  const presets = presetRanges();
  if (range.from === presets.today.from && range.to === presets.today.to)
    return "today";
  if (range.from === presets.month.from && range.to === presets.month.to)
    return "month";
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
  const [dateOpen, setDateOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(range);
  const [displayRange, setDisplayRange] = useState(range);
  const { from: appliedFrom, to: appliedTo } = range;

  useEffect(() => {
    setDisplayRange({ from: appliedFrom, to: appliedTo });
  }, [appliedFrom, appliedTo]);

  const dateLabel =
    displayRange.from === displayRange.to
      ? shortDate(displayRange.from)
      : `${shortDate(displayRange.from)} – ${shortDate(displayRange.to)}`;

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
        value={activePreset(displayRange)}
        onValueChange={(preset) => {
          if (preset === "custom") return;
          const nextRange = presetRanges()[preset];
          setDisplayRange(nextRange);
          onRangeChange(nextRange);
        }}
        options={[
          { value: "today", label: "Today" },
          { value: "month", label: "This month" },
        ]}
      />

      <Popover
        open={dateOpen}
        onOpenChange={(open) => {
          if (open) setDraftRange(displayRange);
          setDateOpen(open);
        }}
      >
        <PopoverTrigger
          nativeButton
          render={
            <Button
              type="button"
              variant="outline"
              size="lg"
              shape="pill"
              className="gap-2 bg-card px-4 font-normal shadow-none lg:ml-auto"
            />
          }
        >
          <CalendarDays
            data-icon="inline-start"
            className="text-muted-foreground"
            aria-hidden="true"
          />
          {dateLabel}
          <ChevronDown
            data-icon="inline-end"
            className="text-muted-foreground"
            aria-hidden="true"
          />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex w-72 flex-col gap-4 rounded-2xl p-4"
        >
          <p className="text-sm font-medium">Filter by date</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payments-from" className="text-sm font-medium">
              From date
            </label>
            <DatePicker
              id="payments-from"
              shape="pill"
              value={draftRange.from}
              onValueChange={(from) =>
                setDraftRange((current) => ({ ...current, from }))
              }
              max={draftRange.to}
              clearable={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="payments-to" className="text-sm font-medium">
              To date
            </label>
            <DatePicker
              id="payments-to"
              shape="pill"
              value={draftRange.to}
              onValueChange={(to) =>
                setDraftRange((current) => ({ ...current, to }))
              }
              min={draftRange.from}
              max={today}
              clearable={false}
            />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border-lighter pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              shape="pill"
              onClick={() => setDateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              shape="pill"
              onClick={() => {
                setDisplayRange(draftRange);
                onRangeChange(draftRange);
                setDateOpen(false);
              }}
            >
              Apply dates
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        variant="outline"
        size="lg"
        shape="pill"
        className="gap-2 bg-card px-4 font-normal text-muted-foreground shadow-none"
        onClick={() => {
          const nextRange = presetRanges().today;
          onSearchChange("");
          setDisplayRange(nextRange);
          onRangeChange(nextRange);
          setDateOpen(false);
        }}
      >
        <X data-icon="inline-start" aria-hidden="true" />
        Clear filters
      </Button>
    </div>
  );
}
