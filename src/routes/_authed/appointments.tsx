import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  getBookableRequestsFn,
  getMyAppointmentsFn,
} from "~/features/appointments/appointments.queries";
import { AppointmentsList } from "~/features/appointments/components/AppointmentsList";
import { BookingForm } from "~/features/appointments/components/BookingForm";
import { CheckInBanner } from "~/features/queue/components/CheckInBanner";
import { getMyTicketFn, getTodayAppointmentFn } from "~/features/queue/queue.queries";

export const Route = createFileRoute("/_authed/appointments")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_own"))
      throw new Error("Forbidden");
  },
  loader: async () => {
    const [requests, appointments, todayAppointment, ticket] = await Promise.all([
      getBookableRequestsFn(),
      getMyAppointmentsFn(),
      getTodayAppointmentFn(),
      getMyTicketFn(),
    ]);
    return { requests, appointments, todayAppointment, ticket };
  },
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const { requests, appointments, todayAppointment, ticket } = Route.useLoaderData();
  const router = useRouter();

  return (
    <div className="dashboard-page max-w-5xl">
      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              Applicant workspace
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              My Appointments
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Reserve a morning or afternoon slot for your CCRO visit. Your queue
              number is issued when you check in on the day.
            </p>
          </div>
          <Link
            to="/my-requests"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-primary-soft"
          >
            View My Requests
          </Link>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-8">
        <CheckInBanner
          appointment={todayAppointment}
          ticket={ticket}
          onCheckedIn={() => router.invalidate()}
        />

        <div>
          <h2 className="mb-3 text-lg font-bold text-foreground">
            Your upcoming appointments
          </h2>
          <AppointmentsList
            appointments={appointments}
            onCancelled={() => router.invalidate()}
          />
        </div>

        <BookingForm requests={requests} onBooked={() => router.invalidate()} />
      </div>
    </div>
  );
}
