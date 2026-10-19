import { ArrowRight } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { pillButton } from "~/components/portal/styles";
import { cn } from "~/lib/utils";
import { openWelcomeTutorial } from "~/features/onboarding/components/WelcomeTutorial";
import { bannerStyle } from "../banners";
import { CertificateTiles } from "./CertificateTiles";

interface QuickStartPanelProps {
  /** The whole dashboard for an applicant with no requests yet. */
  prominent?: boolean;
}

// A light text link: reopens the tutorial that otherwise only opens once.
const HOW_IT_WORKS =
  "civic-press rounded-full px-1 py-2 text-base font-semibold text-primary hover:text-primary-hover";

/**
 * Where a new request starts: the four documents as tiles. With no requests
 * yet it leads with a blue card asking what the applicant needs. Otherwise it
 * is a quiet slim row at the foot of the page: someone tracking a request is
 * here for the tracker, not to start another.
 */
export function QuickStartPanel({ prominent = false }: QuickStartPanelProps) {
  if (prominent) {
    return (
      <>
        <section
          style={bannerStyle("none")}
          className="portal-banner font-geist flex flex-col items-start gap-6 rounded-hero px-5 py-7 md:flex-row md:items-center md:gap-8 md:px-10 md:py-9"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-[28px] leading-[1.15] font-bold tracking-normal text-foreground md:text-[42px]">
              What do you need today?
            </h2>
            <p className="mt-3.5 text-[17px] leading-[normal] text-body-2 md:text-[19px]">
              Pick a document. You'll see what to bring first.
            </p>
            <button
              type="button"
              onClick={openWelcomeTutorial}
              className={cn(
                HOW_IT_WORKS,
                "civic-nudge mt-4 inline-flex items-center gap-1.5 text-[17px] font-bold md:text-lg",
              )}
            >
              How it works
              <ArrowRight className="size-4.5" aria-hidden="true" />
            </button>
          </div>
          <QuietLink
            to="/services"
            className="civic-press civic-nudge inline-flex h-13.5 max-md:w-full shrink-0 items-center justify-center gap-2.5 rounded-full bg-card/78 px-7.5 text-[17px] font-semibold whitespace-nowrap text-foreground hover:bg-card md:h-13"
          >
            See all services
            <ArrowRight className="size-5" aria-hidden="true" />
          </QuietLink>
        </section>
        <CertificateTiles />
      </>
    );
  }

  return (
    <section className="flex flex-col gap-3.5 md:gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="px-1.5 text-xl leading-[normal] font-semibold text-foreground md:text-[15px] md:text-muted-foreground">
          Start a new request
        </h2>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={openWelcomeTutorial}
            className={cn(HOW_IT_WORKS, "py-1 text-sm")}
          >
            How it works
          </button>
          <QuietLink
            to="/services"
            className={cn(pillButton.light, "h-10 px-4.5 text-[15px] md:h-9 md:px-4 md:text-sm")}
          >
            <span className="md:hidden">See all</span>
            <span className="max-md:hidden">See all services</span>
          </QuietLink>
        </div>
      </div>
      <CertificateTiles strip />
    </section>
  );
}
