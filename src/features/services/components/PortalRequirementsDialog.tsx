import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, MapPin, User, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "~/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { staggerStyle } from "~/components/motion/stagger";
import type { ServiceRequirement } from "~/features/admin/services/services.types";
import { useServiceOverview } from "~/features/services/hooks/useServiceOverview";
import {
  cleanStepText,
  formatFee,
  formatPesoFee,
  getVisitBadge,
  isFullyOnline,
  parseRequirementName,
  portalWait,
  splitCaseLabel,
} from "~/features/services/service-utils";
import { cn } from "~/lib/utils";

interface PortalRequirementsDialogProps {
  /** `display_group ?? service_code` — the same code the apply flow routes on. */
  serviceCode: string;
  /** The full service name; the short one is for cards, not for here. */
  title: string;
  fee: number | string;
  displayGroup: string | null;
  processingTime: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raised by the footer's Apply; the card then asks to confirm before routing. */
  onApply?: () => void;
}

const CASE_TAG_LABELS: Record<string, string> = {
  marital_only: "Marital child only",
  non_marital_only: "Non-marital child only",
  brap_only: "Barangay-assisted (BRAP) only",
  foreigner_only: "Foreign parent only",
  parental_consent_required: "Ages 18–20",
  parental_advice_required: "Ages 21–24",
  foreign_national_spouse: "Foreign-national applicant",
};

// The charter writes amounts into step text as "(P100)". They are the one thing
// in a step worth the eye, so they are set heavier; the wording is left alone.
const AMOUNT = /(\(P[\d,.]+\))/g;

function StepText({ text }: { text: string }) {
  return (
    <>
      {text.split(AMOUNT).map((part, index) =>
        /^\(P[\d,.]+\)$/.test(part) ? (
          <strong key={index} className="font-bold text-foreground">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * The scrolling middle of the dialog. The header and footer stay put while this
 * moves; a fade at the top lets rows slide under the header, and one at the
 * bottom says there is more while there is.
 */
function ScrollBody({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const top = el.scrollTop > 1;
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (scroller.current) observer.observe(scroller.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={measure}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 scrollbar-thin [scrollbar-color:#c3cddc_transparent] sm:px-9"
      >
        <div ref={content} className="pb-7">
          {children}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-14 bg-linear-to-b from-card to-card/0 transition-opacity duration-150",
          edges.top ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-22.5 bg-linear-to-t from-card to-card/0 transition-opacity duration-150",
          edges.bottom ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "free";
}) {
  return (
    <div className="rounded-[20px] bg-portal-panel px-6 py-5">
      <p className="text-[13px] leading-[normal] font-bold tracking-[0.12em] text-muted-2 uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 leading-[1.15] font-bold",
          value.length > 12 ? "text-[26px]" : "text-[34px]",
          tone === "free" ? "text-tone-success" : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm leading-snug text-muted-2">{note}</p>
    </div>
  );
}

/**
 * One document: its name, what to bring of it, where to secure it, and whether
 * it depends on the case. The stored text is shown as it is; `parseRequirementName`
 * only decides which line each part sits on.
 */
function RequirementRow({ requirement }: { requirement: ServiceRequirement }) {
  const { caseLabel, name } = splitCaseLabel(requirement.requirement_name);
  const { primary, secondary } = parseRequirementName(name);

  // After the dash is usually what to bring ("1 original"). A few rows put the
  // source there instead ("Secure from the hospital"); those belong on the
  // location line, as `where_to_secure` does.
  const secondaryIsLocation = !!secondary && /^(secure|obtain|get|request)\b/i.test(secondary);
  const detail = secondaryIsLocation ? null : secondary;
  const location = requirement.where_to_secure ?? (secondaryIsLocation ? secondary : null);

  const pill = requirement.applies_when
    ? "Depends on case answers"
    : requirement.case_tag
      ? (CASE_TAG_LABELS[requirement.case_tag] ?? null)
      : !requirement.is_mandatory
        ? "Only if it applies to you"
        : null;
  const inPerson = /personal appearance|appear in person|in person/i.test(primary);
  const Icon = inPerson ? User : FileText;

  return (
    <li className="flex items-start gap-4 px-5.5 py-4">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] leading-snug font-semibold text-foreground">{primary}</p>
        {detail && (
          <p className="mt-0.5 text-[15px] leading-snug text-muted-2">{detail}</p>
        )}
        {location && (
          <p className="mt-1 flex items-start gap-1.5 text-sm leading-snug text-muted-2">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {location}
          </p>
        )}
        {(caseLabel || pill) && (
          <span className="mt-2 inline-flex h-6.5 items-center rounded-full bg-primary-soft px-3 text-[13px] font-semibold text-primary-hover">
            {caseLabel ?? pill}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * The applicant's "Check requirements" dialog: what to bring, what it costs, how
 * long it takes, what happens at the counter. The staff reference keeps the
 * plainer dialog in `ServiceRequirementsDialog`.
 */
export function PortalRequirementsDialog({
  serviceCode,
  title,
  fee,
  displayGroup,
  processingTime,
  open,
  onOpenChange,
  onApply,
}: PortalRequirementsDialogProps) {
  const { overview, loading, error, retry } = useServiceOverview(serviceCode, open);
  // Focus starts on the title, so a stray Enter never applies.
  const titleRef = useRef<HTMLHeadingElement>(null);

  const isGroup = overview?.isGroup ?? false;
  const requirements = (overview?.requirements ?? []) as ServiceRequirement[];

  // Steps differ per case inside a group, so only a single-case service can
  // show one honest "what happens at the office" list.
  const rawSteps = overview && !isGroup ? (overview.services[0].steps_description ?? []) : null;
  const steps: string[] = (rawSteps ?? []).map(cleanStepText).filter((step) => step.length > 0);
  const visitLabel =
    rawSteps && isFullyOnline(rawSteps) ? "Fully online" : getVisitBadge(processingTime).label;

  const feeValue = formatPesoFee(fee, displayGroup);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        initialFocus={titleRef}
        overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
        className="flex max-h-[min(60rem,calc(100vh-7.5rem))] w-[min(48.75rem,calc(100%-2rem))] max-w-none flex-col gap-0 overflow-hidden rounded-[28px] bg-card p-0 shadow-portal-dialog ring-0 sm:max-w-none"
      >
        <header className="relative shrink-0 bg-(image:--portal-hero) px-6 pt-7.5 pr-18 pb-7 sm:px-9 sm:pr-20">
          <span className="inline-flex h-7.5 items-center rounded-full bg-card/70 px-3.5 text-sm font-bold text-foreground">
            {visitLabel}
          </span>
          <DialogTitle
            ref={titleRef}
            tabIndex={-1}
            className="mt-3.5 font-sans text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-foreground outline-none sm:text-[30px]"
          >
            {title}
          </DialogTitle>
          {/* The title says what this is; the description is for screen readers. */}
          <DialogDescription className="sr-only">
            What to bring, what it costs and how long it takes.
          </DialogDescription>
          <DialogClose
            render={
              <button
                type="button"
                aria-label="Close"
                className="civic-press absolute top-4.5 right-4.5 flex size-10 items-center justify-center rounded-full bg-card/70 text-foreground hover:bg-card"
              />
            }
          >
            <X className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
          </DialogClose>
        </header>

        <ScrollBody>
          <div className="mt-6.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat
              label="Fee at cashier"
              value={feeValue}
              note="Pay at the CCRO cashier"
              tone={feeValue === "Free" ? "free" : undefined}
            />
            <Stat
              label="Time at the office"
              value={portalWait(processingTime)}
              note={processingTime}
            />
          </div>

          {loading && (
            <div className="civic-stagger mt-8 flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-18 rounded-[20px]" style={staggerStyle(i)} />
              ))}
            </div>
          )}

          {!loading && error && (
            <Alert variant="destructive" className="civic-enter-scale mt-8">
              <AlertTitle>Unable to load requirements</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button type="button" variant="outline" size="sm" onClick={retry}>
                Try again
              </Button>
            </Alert>
          )}

          {!loading && !error && overview && (
            <div className="civic-stagger-auto">
              {isGroup && (
                <section className="mt-8.5">
                  <h3 className="text-[21px] leading-[normal] font-bold text-foreground">
                    This service covers {overview.services.length} cases
                  </h3>
                  <p className="mt-1.5 text-[15px] leading-snug text-muted-2">
                    The fee and the steps depend on which one applies to you — you'll pick yours
                    on the first step of the application.
                  </p>
                  <ul className="mt-4 divide-y divide-border-lighter overflow-hidden rounded-[20px] border border-border-light">
                    {overview.services.map((service) => (
                      <li
                        key={service.service_code}
                        className="flex items-baseline justify-between gap-4 px-5.5 py-4"
                      >
                        <span className="text-[17px] leading-snug font-semibold text-foreground">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-base font-bold text-foreground">
                          {formatFee(service.fee)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="mt-8.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-[21px] leading-[normal] font-bold text-foreground">
                    Documents to bring
                  </h3>
                  <span className="inline-flex h-6.5 min-w-6.5 items-center justify-center rounded-full bg-primary-fill px-2 text-[13px] font-bold text-white">
                    {requirements.length}
                  </span>
                </div>
                {requirements.length === 0 ? (
                  <p className="mt-4 rounded-[20px] border border-dashed border-dashed-border px-5.5 py-4 text-[15px] text-muted-2 italic">
                    No required documents are listed for this service.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-border-lighter overflow-hidden rounded-[20px] border border-border-light">
                    {requirements.map((requirement) => (
                      <RequirementRow key={requirement.id} requirement={requirement} />
                    ))}
                  </ul>
                )}
              </section>

              {steps.length > 0 && (
                <section className="mt-8.5">
                  <h3 className="mb-5 text-[21px] leading-[normal] font-bold text-foreground">
                    What happens at the office
                  </h3>
                  <ol>
                    {steps.map((step, index) => (
                      <li key={index} className="flex gap-4">
                        {/* The line runs from under one number to the next. */}
                        <div className="flex flex-col items-center">
                          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[15px] font-bold text-primary">
                            {index + 1}
                          </span>
                          {index < steps.length - 1 && (
                            <span
                              className="mt-1.5 w-0.5 flex-1 bg-[#cfd8e8] dark:bg-border-strong"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                        <p
                          className={cn(
                            "min-w-0 flex-1 pt-1 text-base leading-[1.55] text-portal-ink-2",
                            index < steps.length - 1 && "pb-4.5",
                          )}
                        >
                          <StepText text={step} />
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}
        </ScrollBody>

        <footer className="flex shrink-0 justify-end gap-3 border-t border-border-lighter px-6 pt-5 pb-6 sm:px-9">
          <DialogClose
            render={
              <button
                type="button"
                className="civic-press h-13 rounded-full border border-border bg-card px-7 text-base font-semibold text-foreground hover:bg-primary-tint"
              />
            }
          >
            Close
          </DialogClose>
          {onApply && (
            <button
              type="button"
              onClick={onApply}
              className="civic-press h-13 rounded-full bg-primary-fill px-8 text-base font-semibold text-white shadow-[0_8px_20px_rgba(11,77,162,0.28)] hover:bg-primary-fill-hover"
            >
              Apply
            </button>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
