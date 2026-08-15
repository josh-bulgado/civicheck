import { createFileRoute, useRouter } from "@tanstack/react-router";
import { hasPermission, type Role } from "~/lib/permissions";
import {
  getEncodableServicesFn,
  getQueueCountersFn,
  getTodayQueueFn,
} from "~/features/queue/queue.queries";
import { QueueDeskConsole } from "~/features/queue/components/QueueDeskConsole";

export const Route = createFileRoute("/_authed/queue")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "queue:manage"))
      throw new Error("Forbidden");
  },
  loader: async ({ context }) => {
    const canEncode = hasPermission(
      (context.user?.role ?? "applicant") as Role,
      "requests:encode_walkin",
    );

    const [tickets, counters, services] = await Promise.all([
      getTodayQueueFn(),
      getQueueCountersFn(),
      canEncode ? getEncodableServicesFn() : Promise.resolve([]),
    ]);

    return { tickets, counters, services };
  },
  component: QueueDeskPage,
});

function QueueDeskPage() {
  const { tickets, counters, services } = Route.useLoaderData();
  const router = useRouter();

  const waiting = tickets.filter((t) => t.status === "waiting").length;
  const serving = tickets.filter((t) => t.status === "serving").length;
  const served = tickets.filter((t) => t.status === "served").length;

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="dashboard-hero">
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
              Counter operations
            </p>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
              Queue Desk
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Issue queue numbers, encode walk-ins, and call applicants to the
              counter.
            </p>
          </div>
          <div className="flex gap-6 text-white">
            <div>
              <p className="text-2xl font-extrabold">{waiting}</p>
              <p className="text-xs text-white/70">Waiting</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{serving}</p>
              <p className="text-xs text-white/70">Serving</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold">{served}</p>
              <p className="text-xs text-white/70">Served today</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-8">
        <QueueDeskConsole
          tickets={tickets}
          counters={counters}
          services={services}
          onChanged={() => router.invalidate()}
        />
      </div>
    </div>
  );
}
