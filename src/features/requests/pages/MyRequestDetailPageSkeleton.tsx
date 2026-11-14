import { Skeleton } from "~/components/ui/skeleton";
import { QuietLink } from "~/components/quiet-link";
import { Button, buttonVariants } from "~/components/ui/button";
import { ChevronLeft, Download, FileText } from "lucide-react";

/** Match progress/documents on the left and details/history on the right. */
export function MyRequestDetailPageSkeleton() {
  return (
    <div className="portal-page @container gap-5 md:gap-6" aria-label="Loading your request…" role="status">
      <div className="flex flex-col gap-3">
        <QuietLink to="/my-requests" aria-label="Back to my requests" className={buttonVariants({ size: "sm", className: "w-fit" })}>
          <ChevronLeft aria-hidden="true" data-icon="inline-start" />Back
        </QuietLink>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-6">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-2.5">
            <Skeleton className="h-7 w-80 max-w-full rounded-xl md:h-10" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 md:gap-6 @4xl:grid-cols-[minmax(0,1fr)_22rem] @4xl:grid-rows-[auto_1fr] @5xl:grid-cols-[minmax(0,1fr)_24rem] @6xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="min-w-0">
          <section className="rounded-hero bg-(image:--portal-hero) px-4 py-5 md:px-13 md:pt-11 md:pb-12">
            <div className="grid grid-cols-4 md:gap-2" aria-hidden="true">
              {["Submission", "Validation", "Processing", "Release"].map((stage, index) => (
                <div key={stage} className="relative flex min-w-0 flex-col gap-2 max-md:items-center md:gap-4">
                  <Skeleton className="relative z-10 size-8 rounded-full" />
                  {index < 3 ? <span className="absolute top-4 left-1/2 h-0.75 w-full -translate-y-1/2 bg-primary/65 md:hidden" /> : null}
                  <span className="text-[0.6875rem] font-semibold text-foreground min-[360px]:text-xs md:text-sm max-md:w-full max-md:text-center max-md:wrap-anywhere">{stage}</span>
                </div>
              ))}
            </div>
            <h2 className="mt-6 text-base font-semibold text-body-strong md:mt-10 md:text-[17px]">What to do next</h2>
            <Skeleton aria-hidden="true" className="mt-3 h-28 rounded-[20px] md:mt-4" />
          </section>
        </div>
        <div className="min-w-0 @4xl:col-start-1 @4xl:row-start-2">
          <section className="rounded-3xl border border-border-light bg-card p-5 sm:p-6">
            <h2 className="text-[22px] font-semibold max-md:text-lg">Documents</h2>
            <Skeleton aria-hidden="true" className="mt-4 h-80 rounded-xl" />
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-5 md:gap-6 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1">
          <section className="flex flex-col gap-4 rounded-3xl border border-border-light bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Submitted details</h2>
              <Button disabled variant="secondary" size="sm" className="text-xs">View full details</Button>
            </div>
            <Skeleton aria-hidden="true" className="h-24 rounded-xl" />
            <div className="border-t border-border-lighter pt-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold wrap-anywhere"><FileText className="hidden size-4 shrink-0 text-primary min-[360px]:block" aria-hidden="true" />Acknowledgment slip</h3>
                <Button disabled variant="link" size="touch" className="px-0 text-xs"><Download data-icon="inline-start" aria-hidden="true" />Download PDF</Button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Save or print a copy with your tracking number and document checklist.</p>
            </div>
          </section>
          <section className="rounded-3xl border border-border-light bg-card p-5 sm:p-6">
            <h2 className="text-[22px] font-semibold max-md:text-lg">Status history</h2>
            <Skeleton aria-hidden="true" className="mt-4 h-24 rounded-xl" />
          </section>
        </div>
      </div>
    </div>
  );
}
