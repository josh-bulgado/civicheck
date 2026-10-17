import { WizardBar, WizardSkeleton } from "~/features/apply/components/wizard-feedback";

/** One upload slot as it will look: icon tile, two lines, two pill buttons. */
export function SlotCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[20px] border-2 border-dashed border-[#d7dee9] bg-card">
      <div className="flex items-start gap-4 px-6 pt-5.5 pb-4.5">
        <WizardSkeleton className="size-14 shrink-0 rounded-[14px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-1">
          <WizardSkeleton className="h-5 w-2/5 rounded-full" />
          <WizardSkeleton className="h-4 w-3/5 rounded-full" />
        </div>
      </div>
      <div className="flex gap-3 px-6 pb-5">
        <WizardSkeleton className="h-12 w-36 rounded-full" />
        <WizardSkeleton className="h-12 w-36 rounded-full" />
      </div>
    </div>
  );
}

/**
 * What stands in for the wizard while its service loads: a bar along the top
 * edge, then the rail, the docket and a card in the shape the page will take.
 */
export function WizardPageSkeleton() {
  return (
    <div
      className="apply-wizard apply-wizard-ground min-h-screen"
      role="status"
      aria-busy="true"
      aria-label="Loading your application…"
    >
      <WizardBar className="fixed inset-x-0 top-0 z-50 h-1 rounded-none" />

      <div className="flex flex-col gap-4 px-5 pt-5 pb-4 sm:px-8 md:flex-row md:items-center md:gap-6 md:px-14 md:pt-7 md:pb-6.5">
        <div className="flex items-center gap-2.5 md:w-60">
          <WizardSkeleton className="size-10.5 rounded-full" />
          <WizardSkeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="flex items-center gap-3.5 md:mx-auto md:max-w-245 md:flex-1">
          {[0, 1, 2, 3].map((step) => (
            <div key={step} className="flex flex-1 items-center gap-3.5 last:flex-initial">
              <WizardSkeleton className="size-8.5 shrink-0 rounded-full" />
              <WizardSkeleton className="hidden h-0.75 flex-1 rounded-full md:block" />
            </div>
          ))}
        </div>
        <span className="hidden md:block md:w-60" aria-hidden="true" />
      </div>

      <div className="px-3 sm:px-8 md:px-14">
        <WizardSkeleton className="mx-auto h-20 max-w-353.5 rounded-4xl" />
      </div>

      <div className="mx-auto w-full px-3 pt-4 pb-10 sm:px-8 md:px-14 md:pt-5">
        <div className="mx-auto max-w-263.5 rounded-[28px] bg-card p-5 shadow-portal-card sm:p-7 md:px-10 md:pt-9 md:pb-8">
          <WizardSkeleton className="h-9 w-2/3 rounded-xl" />
          <WizardSkeleton className="mt-3 h-4 w-1/2 rounded-full" />
          <div className="mt-7 flex flex-col gap-3.5">
            <SlotCardSkeleton />
            <SlotCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
