import { enterDelay } from "~/components/motion/stagger";
import { FORM_TITLE_CLASS } from "~/features/forms/components/wizard-field";
import { cn } from "~/lib/utils";

interface WizardShellProps {
  step: 1 | 2 | 3 | 4;
  title: string;
  /** Intro line under the title; a step that doesn't need one leaves it out. */
  description?: React.ReactNode;
  sidebar?: React.ReactNode;
  hideSidebarOnMobile?: boolean;
  children: React.ReactNode;
}

export function WizardShell({
  step,
  title,
  description,
  sidebar,
  hideSidebarOnMobile,
  children,
}: WizardShellProps) {
  return (
    // Every wizard step renders through here, so keying on the step number is
    // what makes moving between them feel like a step rather than a redraw: the
    // card is torn down and rebuilt, which replays the entrance.
    <div key={step} data-service-form className="mx-auto w-full px-3 pt-4 pb-10 sm:px-8 md:px-14 md:pt-5">
      {/* The card is the same 1054px on every step; a step with a sidebar
          adds the sidebar's column beside it instead of narrowing the card. */}
      <div
        className={
          sidebar
            ? "mx-auto grid max-w-353.5 items-start gap-5 lg:grid-cols-[1fr_340px]"
            : "mx-auto max-w-263.5"
        }
      >
        <div className="civic-enter rounded-[28px] bg-card p-5 shadow-portal-card max-md:min-w-0 sm:p-7 md:px-10 md:pt-9 md:pb-8">
          {title || description ? <div className="flex flex-col gap-2 pb-6">
            {title ? (
            <h1 className={FORM_TITLE_CLASS}>
              {title}
            </h1>
            ) : null}
            {description ? (
              // No width cap: the intros are one short sentence, and a cap
              // narrower than the card only left a gap on the right while the
              // last few words dropped to a second line.
              <p className="text-base leading-relaxed text-body-2">{description}</p>
            ) : null}
          </div> : null}
          {children}
        </div>
        {sidebar && (
          <div
            // Sticks below the pinned selected-service band rather than
            // sliding underneath it.
            className={cn(
              "civic-enter mt-5 flex flex-col gap-4 lg:sticky lg:top-36 lg:mt-0",
              hideSidebarOnMobile && "hidden md:flex",
            )}
            style={enterDelay(90)}
          >
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}
