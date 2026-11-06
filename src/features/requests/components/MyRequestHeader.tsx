import { ChevronLeft } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { buttonVariants } from "~/components/ui/button";
import { StatusPill } from "~/features/requests/components/StatusPill";
import { cn } from "~/lib/utils";

/**
 * The top of an applicant's request page: the way back, then what it is for
 * (the service, with the tracking number under it) and where it stands. A
 * `note` is one muted line under the tracking number: for a rejected request,
 * why, since the page has no other place that says.
 */
export function MyRequestHeader({
  serviceName,
  trackingNumber,
  status,
  note,
}: {
  serviceName: string;
  trackingNumber: string;
  status: string;
  note?: string | null;
}) {
  return (
    <header>
      <QuietLink
        to="/my-requests"
        aria-label="Back to my requests"
        className={cn(
          buttonVariants({ size: "sm", shape: "pill" }),
          "w-fit gap-1 pl-2 pr-3 text-[13px] font-medium hover:bg-primary-fill-hover",
        )}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back
      </QuietLink>
      <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-6">
        {/* `min-w-0` lets a long service name wrap here instead of pushing the
            status off the edge. */}
        <div className="min-w-0 flex-1">
          <h1 className="portal-title text-pretty">
            {serviceName}
          </h1>
          <p className="mt-2 font-mono text-[15px] leading-[normal] text-muted-foreground wrap-anywhere">
            {trackingNumber}
          </p>
          {note && (
            <p className="mt-3 max-w-prose text-[17px] leading-snug text-body-2 text-pretty">
              {note}
            </p>
          )}
        </div>
        <StatusPill status={status} className="h-10 shrink-0 text-base sm:mt-1" />
      </div>
    </header>
  );
}
