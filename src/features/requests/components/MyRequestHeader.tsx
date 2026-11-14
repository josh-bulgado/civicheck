import { ChevronLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import { QuietLink } from "~/components/quiet-link";
import { Button, buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/**
 * The top of an applicant's request page: the way back, then what it is for
 * (the service, with the tracking number under it). Status history shows where
 * the request stands. A `note` is one muted line under the tracking number:
 * for a rejected request,
 * why, since the page has no other place that says.
 */
export function MyRequestHeader({
  serviceName,
  trackingNumber,
  note,
}: {
  serviceName: string;
  trackingNumber: string;
  note?: string | null;
}) {
  async function copyTrackingNumber() {
    try {
      await navigator.clipboard.writeText(trackingNumber);
      toast.success(`Copied ${trackingNumber}`);
    } catch {
      toast.error("Could not copy. Select the number and copy it instead.");
    }
  }

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
        {/* Keep long service names within the page width. */}
        <div className="min-w-0 flex-1">
          <h1 className="portal-title text-pretty max-md:text-[22px] max-md:leading-tight">
            {serviceName}
          </h1>
          <div className="mt-2 flex min-w-0 items-center gap-1">
            <p className="min-w-0 font-mono text-[15px] leading-[normal] text-muted-foreground select-all wrap-anywhere max-md:text-[13px]">
              {trackingNumber}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Copy tracking number"
              title="Copy tracking number"
              onClick={copyTrackingNumber}
            >
              <Copy aria-hidden="true" />
            </Button>
          </div>
          {note && (
            <p className="mt-3 max-w-prose text-[17px] leading-snug text-body-2 text-pretty max-md:text-sm max-md:leading-relaxed">
              {note}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
