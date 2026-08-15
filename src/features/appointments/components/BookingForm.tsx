import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { getSlotAvailabilityFn } from "~/features/appointments/appointments.queries";
import { bookAppointmentFn } from "~/features/appointments/appointments.mutations";

export interface BookableRequest {
  id: string;
  trackingNumber: string;
  serviceName: string;
  status: string | null;
}

interface SlotAvailability {
  id: string;
  slotCode: string;
  label: string;
  startTime: string;
  endTime: string;
  remaining: number | null;
  isFull: boolean;
}

function nextWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function fromDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  // Format using local date parts, not toISOString() — that converts to UTC
  // first, which silently shifts the calendar date for any timezone ahead
  // of UTC (e.g. Philippines, UTC+8) when run near local midnight.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface BookingFormProps {
  requests: BookableRequest[];
  onBooked: () => void;
}

export function BookingForm({ requests, onBooked }: BookingFormProps) {
  const days = useMemo(() => nextWeekdays(10), []);
  const [requestId, setRequestId] = useState<string>(requests[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(days[0]));
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSelectedSlotId(null);
    getSlotAvailabilityFn({ data: { date: selectedDate } }).then((res) => {
      if (cancelled) return;
      setSlots(res);
      setLoadingSlots(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  if (requests.length === 0) {
    return (
      <p className="rounded-[10px] border border-dashed border-dashed-border bg-white p-5 text-sm italic text-muted-foreground">
        All of your requests already have a booked slot, or you don't have any
        requests yet.
      </p>
    );
  }

  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;
  const canConfirm = !!requestId && !!selectedDate && !!selectedSlotId && !submitting;

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await bookAppointmentFn({
        data: { requestId, date: selectedDate, timeSlotId: selectedSlotId! },
      });
      if (res.error) {
        setError(res.message || "Something went wrong. Please try again.");
        return;
      }
      onBooked();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-white p-6 sm:p-8">
      <h2 className="text-lg font-bold text-foreground">Book a new slot</h2>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-body-strong">
          Which request is this for?
        </label>
        <Select value={requestId} onValueChange={(value) => setRequestId(value ?? "")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {requests.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.trackingNumber} — {r.serviceName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-body-strong">Date</label>
        <div className="flex flex-wrap gap-2.5">
          {days.map((day) => {
            const key = toDateKey(day);
            const active = key === selectedDate;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(key)}
                className={`flex min-w-32 flex-col items-start gap-0.5 rounded-[10px] border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-2 border-primary bg-primary-tint"
                    : "border-control-border bg-white hover:border-dashed-border"
                }`}
              >
                <span className={`text-sm ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-base font-bold text-foreground">
                  {day.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-body-strong">Time</label>
        {loadingSlots ? (
          <div className="h-11 w-64 animate-pulse rounded-full bg-muted" />
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {slots.map((slot) => {
              const active = slot.id === selectedSlotId;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={slot.isFull}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`rounded-full px-5.5 py-3 text-base transition-colors ${
                    slot.isFull
                      ? "cursor-not-allowed border border-control-border text-disabled"
                      : active
                        ? "bg-primary font-bold text-white"
                        : "border border-control-border text-foreground hover:border-dashed-border"
                  }`}
                >
                  {slot.label}
                  {slot.isFull
                    ? " · full"
                    : slot.remaining != null
                      ? ` · ${slot.remaining} left`
                      : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-border-light pt-6">
        <p className="text-base text-body">
          {selectedSlot ? (
            <>
              Selected:{" "}
              <span className="font-bold text-foreground">
                {fromDateKey(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {selectedSlot.label}
              </span>
            </>
          ) : (
            "Pick a date and time"
          )}
        </p>
        <Button type="button" disabled={!canConfirm} onClick={handleConfirm}>
          {submitting ? "Booking..." : "Confirm slot"}
        </Button>
      </div>
    </div>
  );
}
