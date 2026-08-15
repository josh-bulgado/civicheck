import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Ticket } from "lucide-react";
import { Button } from "~/components/ui/button";
import { selfCheckInFn } from "~/features/queue/queue.mutations";
import { getTicketStatusDetails, laneLabel, type MyTicket } from "~/features/queue/queue.types";

export interface TodayAppointment {
  id: string;
  requestId: string | null;
  slotLabel: string;
  trackingNumber: string;
  serviceName: string;
}

interface CheckInBannerProps {
  appointment: TodayAppointment | null;
  ticket: MyTicket | null;
  onCheckedIn: () => void;
}

export function CheckInBanner({ appointment, ticket, onCheckedIn }: CheckInBannerProps) {
  const [submitting, setSubmitting] = useState(false);

  // Already holding a number — show it instead of the check-in prompt.
  if (ticket) {
    const status = getTicketStatusDetails(ticket.status);
    const called = ticket.status === "called" || ticket.status === "serving";

    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-5 rounded-xl border p-6 ${
          called ? "border-primary bg-primary-tint" : "border-border bg-white"
        }`}
      >
        <div className="flex items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-primary text-2xl font-extrabold tracking-tight text-white">
            {ticket.ticketNumber}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${status.styles}`}
              >
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {laneLabel(ticket.lane)}
              </span>
            </div>
            {called ? (
              <p className="mt-2 flex items-center gap-1.5 text-lg font-bold text-primary">
                <MapPin className="size-5" />
                Proceed to {ticket.counterName ?? "the counter"}
              </p>
            ) : (
              <p className="mt-2 text-lg font-bold text-foreground">
                {ticket.aheadCount === 0
                  ? "You're next in line"
                  : `${ticket.aheadCount} ${ticket.aheadCount === 1 ? "person" : "people"} ahead of you`}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) return null;

  async function handleCheckIn() {
    if (!appointment) return;
    setSubmitting(true);
    try {
      const res = await selfCheckInFn({ data: { appointmentId: appointment.id } });
      if (res.error) {
        toast.error("Could not check you in", { description: res.message });
        return;
      }
      toast.success(`You're checked in — queue number ${res.ticketNumber}`);
      onCheckedIn();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-5 rounded-xl border-2 border-primary bg-primary-tint p-6">
      <div className="flex items-center gap-4">
        <Ticket className="size-8 shrink-0 text-primary" />
        <div>
          <p className="text-base font-bold text-foreground">
            Your appointment is today — {appointment.slotLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {appointment.trackingNumber}
            {appointment.serviceName ? ` · ${appointment.serviceName}` : ""}. Tap
            below once you're at the CCRO to get your queue number.
          </p>
        </div>
      </div>
      <Button onClick={handleCheckIn} disabled={submitting}>
        {submitting ? "Checking in..." : "I'm here — check me in"}
      </Button>
    </div>
  );
}
