import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { hasPermission, type Role } from "~/lib/permissions";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { getAllRequestsFn, type StaffRequestRow } from "~/features/requests/requests.queries";
import {
  REQUEST_STATUSES,
  STAGE_LABELS,
  STAGE_OF,
  getStatusDetails,
  getPaymentDetails,
  type WorkflowStage,
} from "~/features/requests/request-workflow";

const STAGES: WorkflowStage[] = [1, 2, 3, 4, 5];

const STAGE_STATUSES = STAGES.reduce<Record<WorkflowStage, string[]>>(
  (acc, stage) => {
    acc[stage] = REQUEST_STATUSES.filter((s) => STAGE_OF[s] === stage);
    return acc;
  },
  {} as Record<WorkflowStage, string[]>,
);

export const Route = createFileRoute("/_authed/requests/")({
  beforeLoad: ({ context }) => {
    if (!context.user || !hasPermission(context.user.role as Role, "requests:view_all"))
      throw new Error("Forbidden");
  },
  loader: () => getAllRequestsFn(),
  component: RequestQueuePage,
});

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RequestQueuePage() {
  const requests = Route.useLoaderData();
  const [tab, setTab] = useState<string>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: requests.length };
    for (const stage of STAGES) {
      result[String(stage)] = requests.filter((r) =>
        STAGE_STATUSES[stage].includes(r.status),
      ).length;
    }
    return result;
  }, [requests]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (tab !== "all" && !STAGE_STATUSES[Number(tab) as WorkflowStage].includes(r.status))
        return false;
      if (!term) return true;
      return (
        r.trackingNumber.toLowerCase().includes(term) ||
        r.applicantName.toLowerCase().includes(term) ||
        r.serviceName.toLowerCase().includes(term)
      );
    });
  }, [requests, tab, search]);

  return (
    <div className="dashboard-page max-w-7xl">
      <header className="dashboard-hero">
        <div className="relative z-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            CCRO workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
            Request Queue
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            Every request in the office, grouped by the stage it's sitting in.
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">
                All
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                  {counts.all}
                </span>
              </TabsTrigger>
              {STAGES.map((stage) => (
                <TabsTrigger key={stage} value={String(stage)}>
                  {STAGE_LABELS[stage]}
                  {counts[String(stage)] > 0 && (
                    <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                      {counts[String(stage)]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tracking number, name, service"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dashed-border bg-white p-10 text-center text-sm italic text-muted-foreground">
            No requests in this stage.
          </p>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border bg-white lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-subtle text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-bold">Tracking No.</th>
                    <th className="px-5 py-3 font-bold">Applicant</th>
                    <th className="px-5 py-3 font-bold">Service</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold">Payment</th>
                    <th className="px-5 py-3 font-bold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((request) => (
                    <RequestRow key={request.id} request={request} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 lg:hidden">
              {visible.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RequestRow({ request }: { request: StaffRequestRow }) {
  const status = getStatusDetails(request.status);
  const payment = getPaymentDetails(request.paymentStatus);

  return (
    <tr className="border-b border-border-light last:border-0 hover:bg-surface-subtle">
      <td className="px-5 py-4">
        <Link
          to="/requests/$requestId"
          params={{ requestId: request.id }}
          className="font-bold text-primary hover:underline"
        >
          {request.trackingNumber}
        </Link>
      </td>
      <td className="px-5 py-4">
        {request.applicantName}
        {request.isWalkIn && (
          <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
            Walk-in
          </span>
        )}
      </td>
      <td className="px-5 py-4 text-muted-foreground">{request.serviceName}</td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${status.styles}`}
        >
          {status.label}
        </span>
      </td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${payment.styles}`}
        >
          {payment.label}
        </span>
      </td>
      <td className="px-5 py-4 text-muted-foreground">{formatDate(request.createdAt)}</td>
    </tr>
  );
}

function RequestCard({ request }: { request: StaffRequestRow }) {
  const status = getStatusDetails(request.status);
  const payment = getPaymentDetails(request.paymentStatus);

  return (
    <Link
      to="/requests/$requestId"
      params={{ requestId: request.id }}
      className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 hover:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-primary">{request.trackingNumber}</p>
          <p className="text-sm text-foreground">{request.applicantName}</p>
          <p className="text-xs text-muted-foreground">{request.serviceName}</p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${status.styles}`}
        >
          {status.label}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-border-light pt-3 text-xs text-muted-foreground">
        <span>{formatDate(request.createdAt)}</span>
        <span className={`rounded-md border px-2 py-0.5 font-medium ${payment.styles}`}>
          {payment.label}
        </span>
      </div>
    </Link>
  );
}
