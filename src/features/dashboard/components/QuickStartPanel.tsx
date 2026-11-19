import { bannerStyle } from "../banners";
import { CertificateTiles } from "./CertificateTiles";

interface QuickStartPanelProps {
  /** The whole dashboard for an applicant with no requests yet. */
  prominent?: boolean;
}

/**
 * Where a new request starts: the four documents as tiles. With no requests
 * yet it leads with a blue card asking what the applicant needs. Otherwise it
 * is a quiet set of shortcuts at the foot of the page: someone tracking a request is
 * here for the tracker, not to start another.
 */
export function QuickStartPanel({ prominent = false }: QuickStartPanelProps) {
  if (prominent) {
    return (
      <>
        <section
          style={bannerStyle("none")}
          className="portal-banner flex flex-col items-start gap-6 rounded-hero px-5 py-7 xl:flex-row xl:items-center xl:gap-8 xl:px-10 xl:py-9"
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-[28px] leading-[1.15] font-bold tracking-normal text-foreground xl:text-[42px]">
              What do you need today?
            </h2>
            <p className="mt-3.5 text-[17px] leading-[normal] text-body-2 xl:text-[19px]">
              Pick a document. You'll see what to bring first.
            </p>
          </div>
        </section>
        <CertificateTiles />
      </>
    );
  }

  return (
    <section className="flex min-w-0 max-w-full flex-col gap-3.5 max-md:gap-2.5 md:gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="px-1.5 text-xl leading-[normal] font-semibold text-foreground max-md:text-sm max-md:text-muted-foreground md:text-[15px] md:text-muted-foreground">
          Start a new request
        </h2>
      </div>
      <CertificateTiles strip />
    </section>
  );
}
