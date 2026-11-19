import {
  SkeletonHeading,
  PanelSkeleton,
} from "~/components/feedback/PageSkeleton";
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export function CashierCounterSkeleton() {
  return (
    <div
      data-page-skeleton
      role="status"
      aria-label="Loading cashier counter"
      aria-busy="true"
      className="dashboard-page min-w-0"
    >
      <SkeletonHeading title="Cashier Counter" description={<Skeleton aria-hidden="true" className="h-4 w-64 max-w-full" />} />
      <div
        className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]"
      >
        <div className="space-y-5 rounded-2xl border border-border-strong bg-card p-5">
          <dl className="grid grid-cols-2 gap-4">
            {["Verified", "Collected"].map((label) => <div key={label} className="flex flex-col gap-2"><dt className="text-xs font-semibold uppercase text-muted-foreground">{label}</dt><dd><Skeleton className="h-8 w-full" /></dd></div>)}
          </dl>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>Awaiting payment at the office</span><Skeleton className="h-4 w-8 shrink-0" /></div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today’s Tape</h2>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="space-y-2 border-t border-border-light pt-4"
            >
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border-strong bg-card p-5">
            <div className="flex min-w-0 flex-1 flex-col gap-2"><label htmlFor="loading-counter-tracking" className="text-sm font-semibold">Tracking number</label><Input id="loading-counter-tracking" disabled placeholder="Last 6 digits" className="h-16" /></div>
            <Button disabled variant="outline" size="xl" className="h-16 rounded-xl">Scan QR</Button>
          </section>
          <div className="rounded-2xl border border-border-strong bg-card p-6">
            <PanelSkeleton label="Loading payment details" rows={4} />
          </div>
        </div>
      </div>
    </div>
  );
}
