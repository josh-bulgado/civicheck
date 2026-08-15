import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import SiteHeader from "~/features/landing/components/SiteHeader";
import SiteFooter from "~/features/landing/components/SiteFooter";
import { getBookableRequestsFn, getMyAppointmentsFn } from "~/features/queue/queue.queries";
import { AppointmentsList } from "~/features/queue/components/AppointmentsList";
import { BookingForm } from "~/features/queue/components/BookingForm";

export const Route = createFileRoute("/queue")({
  beforeLoad: ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  loader: async () => {
    const [requests, appointments] = await Promise.all([
      getBookableRequestsFn(),
      getMyAppointmentsFn(),
    ]);
    return { requests, appointments };
  },
  component: QueuePage,
});

function QueuePage() {
  const { requests, appointments } = Route.useLoaderData();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-160 flex-1 px-5 py-14 sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="civic-title text-[clamp(1.75rem,4vw,2.625rem)] leading-tight">
            Book a visit slot
          </h1>
          <p className="mt-3.5 text-lg leading-relaxed text-body">
            Reserve a morning or afternoon slot for your CCRO visit, and see
            your upcoming appointments below.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 text-lg font-bold text-foreground">Your upcoming appointments</h2>
            <AppointmentsList
              appointments={appointments}
              onCancelled={() => router.invalidate()}
            />
          </div>

          <BookingForm requests={requests} onBooked={() => router.invalidate()} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
