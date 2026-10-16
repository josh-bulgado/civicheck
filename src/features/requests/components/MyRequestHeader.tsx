import { ArrowLeft } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { StatusPill } from "~/features/requests/components/StatusPill";

/**
 * The top of an applicant's request page: the way back, then what it is for
 * (the service, with the tracking number under it) and where it stands.
 */
export function MyRequestHeader({
  serviceName,
  trackingNumber,
  status,
}: {
  serviceName: string;
  trackingNumber: string;
  status: string;
}) {
  return (
    <header>
      <QuietLink
        to="/my-requests"
        className="civic-press inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-5 text-base font-semibold text-foreground shadow-portal-pill transition-colors duration-150 hover:bg-primary-tint hover:text-primary-hover"
      >
        <ArrowLeft className="size-4.5 text-black" aria-hidden="true" />
        Back to my requests
      </QuietLink>
      <div className="mt-4 flex items-start justify-between gap-4 md:gap-6">
        {/* `min-w-0` lets a long service name wrap here instead of pushing the
            status off the edge. */}
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] leading-[1.12] font-semibold tracking-[-0.02em] text-foreground md:text-[40px]">
            {serviceName}
          </h1>
          <p className="mt-2 font-mono text-[15px] leading-[normal] text-muted-foreground">
            {trackingNumber}
          </p>
        </div>
        <StatusPill status={status} className="h-10 shrink-0 text-base md:mt-1" />
      </div>
    </header>
  );
}
