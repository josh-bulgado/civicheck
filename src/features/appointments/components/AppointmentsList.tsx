import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { cancelAppointmentFn } from "~/features/appointments/appointments.mutations";
import { getAppointmentStatusDetails } from "~/features/appointments/appointment-status";

export interface Appointment {
  id: string;
  appointmentDate: string;
  status: string | null;
  slotLabel: string;
  trackingNumber: string;
  serviceName: string;
}

function formatDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface AppointmentsListProps {
  appointments: Appointment[];
  onCancelled: () => void;
}

export function AppointmentsList({ appointments, onCancelled }: AppointmentsListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const upcoming = appointments.filter((a) => a.status !== "cancelled");

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelAppointmentFn({ data: { appointmentId: id } });
      onCancelled();
    } finally {
      setCancellingId(null);
    }
  }

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center">
        <CalendarDays className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">No upcoming appointments</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Book a slot below for one of your requests.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {upcoming.map((appt) => {
        const status = getAppointmentStatusDetails(appt.status);
        return (
          <div
            key={appt.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white p-5"
          >
            <div>
              <p className="text-base font-bold text-foreground">
                {formatDate(appt.appointmentDate)}
              </p>
              <p className="text-sm text-muted-foreground">
                {appt.slotLabel} · {appt.trackingNumber} · {appt.serviceName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${status.styles}`}
              >
                {status.label}
              </span>
              {appt.status === "scheduled" && (
                <button
                  type="button"
                  onClick={() => handleCancel(appt.id)}
                  disabled={cancellingId === appt.id}
                  className="text-sm font-bold text-destructive hover:underline"
                >
                  {cancellingId === appt.id ? "Cancelling..." : "Cancel"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
