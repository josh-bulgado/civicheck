import { QuietLink as Link } from "~/components/quiet-link";
import { BarChart3, ClipboardList, LayoutGrid, Users } from "lucide-react";
import { JourneyCard } from "~/features/admin/overview/components/JourneyCard";
import {
  LaneLinkBody,
  ResponsibilityLane,
  laneLinkClassName,
} from "~/features/admin/overview/components/ResponsibilityLane";
import { StepInStrip } from "~/features/admin/overview/components/StepInStrip";
import {
  formatCount,
  formatOfficeDate,
} from "~/features/admin/overview/overview-formatters";
import type {
  ServicesSummary,
  TeamSummary,
} from "~/features/admin/overview/overview-metrics";
import type { AdminOverviewData } from "~/features/admin/overview/overview.types";
import { DEFAULT_REPORT_VIEW } from "~/features/admin/reports/reports.types";
import { DEFAULT_REPORT_MONTHS } from "~/features/admin/reports/service-report";
import { cn } from "~/lib/utils";

function pluralize(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function describeTeam({ total, invited, inactive }: TeamSummary) {
  return [
    `${formatCount(total)} ${pluralize(total, "member", "members")}`,
    invited > 0 ? `${formatCount(invited)} invited` : null,
    inactive > 0 ? `${formatCount(inactive)} deactivated` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function describeServices({ total, simple, complex, other }: ServicesSummary) {
  const split = [
    simple > 0 ? `${formatCount(simple)} simple` : null,
    complex > 0 ? `${formatCount(complex)} complex` : null,
    other > 0 ? `${formatCount(other)} other` : null,
  ].filter(Boolean);
  return [
    `${formatCount(total)} ${pluralize(total, "service", "services")}`,
    ...split,
  ].join(" · ");
}

export function AdminOverviewPage({ data }: { data: AdminOverviewData }) {
  const { requests, team, services, officeDate } = data;

  return (
    <div className="dashboard-page">
      <header className="flex flex-col gap-1">
        <h1 className="text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
          Overview
        </h1>
        <p className="text-pretty text-base text-muted-foreground">
          {formatOfficeDate(officeDate)} · {formatCount(requests.openTotal)} open{" "}
          {pluralize(requests.openTotal, "request", "requests")},{" "}
          {formatCount(requests.waitingOnStaff)} waiting on staff
        </p>
      </header>

      {/* The journey and the responsibilities share the left column; Step In is a
          column beside them. Below xl it drops into the page's own order:
          journey, step in, responsibilities. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <JourneyCard requests={requests} />
        </div>

        <div
          className={cn(
            "flex min-w-0 flex-col xl:col-start-2 xl:row-span-2 xl:row-start-1",
            requests.longWaitTotal === 0 && "xl:self-start",
          )}
        >
          <StepInStrip longest={requests.longest} total={requests.longWaitTotal} />
        </div>

        <section
          aria-labelledby="responsibilities-heading"
          className="flex min-w-0 flex-col gap-3 xl:col-start-1 xl:row-start-2"
        >
          <h2 id="responsibilities-heading" className="text-balance text-xl font-bold tracking-tight">
            Your Responsibilities
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ResponsibilityLane
              tone="people"
              icon={Users}
              title="People"
              description="Accounts and roles"
            >
              <Link to="/admin/staff" className={laneLinkClassName("people")}>
                <LaneLinkBody title="Team & Roles" description={describeTeam(team)} />
              </Link>
            </ResponsibilityLane>

            <ResponsibilityLane
              tone="services"
              icon={LayoutGrid}
              title="Services"
              description="What residents can request"
            >
              <Link to="/admin/services" className={laneLinkClassName("services")}>
                <LaneLinkBody title="Services Registry" description={describeServices(services)} />
              </Link>
              <Link
                to="/admin/services/blocks"
                search={{ block: undefined }}
                className={laneLinkClassName("services")}
              >
                <LaneLinkBody
                  title="Shared Question Blocks"
                  description="Questions that several forms reuse"
                />
              </Link>
            </ResponsibilityLane>

            <ResponsibilityLane
              tone="insight"
              icon={BarChart3}
              title="Insight"
              description="How the office is doing"
            >
              <Link
                to="/admin/reports"
                search={{ months: DEFAULT_REPORT_MONTHS, service: undefined, view: DEFAULT_REPORT_VIEW }}
                className={laneLinkClassName("insight")}
              >
                <LaneLinkBody
                  title="Reports"
                  description="Processing time, service performance and busy seasons"
                />
              </Link>
              <Link
                to="/payment-history"
                search={{ from: undefined, to: undefined }}
                className={laneLinkClassName("insight")}
              >
                <LaneLinkBody
                  title="Payment History"
                  description="Payments the cashier has verified"
                />
              </Link>
            </ResponsibilityLane>

            <ResponsibilityLane
              tone="requests"
              icon={ClipboardList}
              title="Requests"
              description="Review and override"
            >
              <Link to="/requests" search={{}} className={laneLinkClassName("requests")}>
                <LaneLinkBody title="Request Queue" description="Every request, filtered your way" />
              </Link>
              <Link
                to="/requests"
                search={{ needs: true }}
                className={laneLinkClassName("requests")}
              >
                <LaneLinkBody
                  title="Waiting on Staff"
                  description={`${formatCount(requests.waitingOnStaff)} ${pluralize(
                    requests.waitingOnStaff,
                    "request needs",
                    "requests need",
                  )} staff to move`}
                />
              </Link>
            </ResponsibilityLane>
          </div>
        </section>
      </div>
    </div>
  );
}
