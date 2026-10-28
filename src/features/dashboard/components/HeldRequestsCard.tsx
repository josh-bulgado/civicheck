import { QuietLink as Link } from "~/components/quiet-link";
import { UserRound, Wallet, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import type { HeldRequests } from "~/features/dashboard/staff-desk";
import { formatCount } from "~/features/admin/overview/overview-formatters";
import type { RequestQueueFilters } from "~/features/requests/request-queue";
import { cn } from "~/lib/utils";

interface HeldRowProps {
  icon: LucideIcon;
  /** Whole class names for the icon's fill, so Tailwind can find them. */
  tone: string;
  title: string;
  /** What to say when nothing is held. */
  empty: string;
  /** What the held request is waiting for, after the applicant's name. */
  reason: string;
  held: HeldRequests;
  /** The queue filter that shows exactly these requests. */
  search: RequestQueueFilters;
}

function HeldRow({ icon: Icon, tone, title, empty, reason, held, search }: HeldRowProps) {
  const { total, oldest } = held;
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 items-center justify-center rounded-full text-background",
          total > 0 ? tone : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-base font-semibold">
          {title} · {formatCount(total)}
        </span>
        <span className="text-sm text-pretty text-muted-foreground">
          {oldest
            ? `${oldest.applicantName} · ${reason} · ${oldest.wait.short}${
                total > 1 ? ` · +${formatCount(total - 1)} more` : ""
              }`
            : empty}
        </span>
      </span>
    </>
  );

  if (total === 0) {
    return <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 px-5 py-3">{body}</div>;
  }

  return (
    <Link
      to="/requests"
      search={search}
      className="civic-interactive grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 px-5 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      {body}
    </Link>
  );
}

/**
 * The requests held up where staff cannot move them: missing documents with the
 * applicant, and an unpaid release at the cashier. They are not on the staff's
 * list, but staff should know they exist.
 */
export function HeldRequestsCard({
  applicant,
  cashier,
}: {
  applicant: HeldRequests;
  cashier: HeldRequests;
}) {
  return (
    <Card variant="quiet" size="sm" className="gap-0 pb-0">
      <CardHeader className="pb-3">
        <CardTitle>
          <h2 className="text-lg font-bold">Not Your Move</h2>
        </CardTitle>
        <CardDescription>Held up outside your desk</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-col divide-y divide-border/60">
          <HeldRow
            icon={UserRound}
            tone="bg-tone-warning"
            title="With the Applicant"
            empty="No one is missing documents"
            reason="missing documents"
            held={applicant}
            search={{ status: "incomplete" }}
          />
          <HeldRow
            icon={Wallet}
            tone="bg-tone-neutral"
            title="At the Cashier"
            empty="Nothing is waiting on payment"
            reason="unpaid"
            held={cashier}
            search={{ status: "ready_for_release", payment: "unpaid" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
