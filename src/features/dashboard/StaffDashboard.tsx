import { formatOfficeDate } from "~/features/admin/overview/overview-formatters";
import {
  CashierDashboard,
  type CashierDashboardData,
} from "~/features/dashboard/CashierDashboard";
import { HeldRequestsCard } from "~/features/dashboard/components/HeldRequestsCard";
import { NextUpCard } from "~/features/dashboard/components/NextUpCard";
import { StaffStageCard } from "~/features/dashboard/components/StaffStageCard";
import { WaitingNextCard } from "~/features/dashboard/components/WaitingNextCard";
import type { StaffDesk } from "~/features/dashboard/staff-desk";
import { WalkInIntakeDialog } from "~/features/requests/components/WalkInIntakeDialog";
import type { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";
import type { EncodableService } from "~/features/requests/walk-in-intake.queries";

interface StaffDeskData {
  isCashier: false;
  canEncodeWalkIn: boolean;
  scope: Awaited<ReturnType<typeof getMyDepartmentScopeFn>>;
  /** Null when the role cannot view the request queue. */
  desk: StaffDesk | null;
  encodableServices: EncodableService[];
  /** The office's calendar day, as YYYY-MM-DD. */
  officeDate: string;
}

export type StaffDashboardStats = StaffDeskData | ({ isCashier: true } & CashierDashboardData);

interface StaffDashboardProps {
  stats: StaffDashboardStats;
  /** Called after a walk-in is encoded, so the route can re-run its loader. */
  onChanged: () => void;
}

export function StaffDashboard({ stats, onChanged }: StaffDashboardProps) {
  if (stats.isCashier) return <CashierDashboard {...stats} />;
  return <StaffDeskPage {...stats} onChanged={onChanged} />;
}

function describeDesk(
  { scope, desk, officeDate }: Pick<StaffDeskData, "scope" | "desk" | "officeDate">,
) {
  return [
    formatOfficeDate(officeDate),
    scope.isScoped && scope.departmentName ? `${scope.departmentName} department` : null,
    desk
      ? desk.yoursTotal === 0
        ? "nothing waiting on you"
        : `${desk.yoursTotal} waiting on you`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The staff dashboard answers one question first: what do I take next? The
 * longest wait on staff leads, the stages show where the work is, and the two
 * holds staff cannot move (applicant, cashier) stay in view.
 */
function StaffDeskPage({
  canEncodeWalkIn,
  scope,
  desk,
  encodableServices,
  officeDate,
  onChanged,
}: StaffDeskData & { onChanged: () => void }) {
  return (
    <div className="dashboard-page">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            Staff Dashboard
          </h1>
          <p className="text-pretty text-base text-muted-foreground">
            {describeDesk({ scope, desk, officeDate })}
          </p>
        </div>
        {canEncodeWalkIn ? (
          <WalkInIntakeDialog services={encodableServices} onChanged={onChanged} />
        ) : null}
      </header>

      {desk ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <NextUpCard request={desk.yours[0] ?? null} total={desk.yoursTotal} />
          <StaffStageCard stages={desk.stages} openTotal={desk.openTotal} />
          <WaitingNextCard
            requests={desk.yours.slice(1)}
            hidden={desk.yoursTotal - desk.yours.length}
          />
          <HeldRequestsCard applicant={desk.applicant} cashier={desk.cashier} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Your role does not include the request queue.
        </p>
      )}
    </div>
  );
}
