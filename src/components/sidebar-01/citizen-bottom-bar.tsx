"use client";

import { QuietLink } from "~/components/quiet-link";
import { usePermissions } from "~/hooks/usePermissions";
import { cn } from "~/lib/utils";
import { buildCitizenMobileNav } from "./nav-config";

// The sidebar's own words are longer than a bar has room for.
const SHORT_LABEL: Record<string, string> = {
  "applicant-dashboard": "Home",
  services: "Services",
  "my-requests": "Requests",
  profile: "Profile",
};

/**
 * The applicant's navigation on a phone: Home, Services, Requests and Profile.
 * Notifications are reached from the top bell. The page you are
 * on is a blue pill that names itself; the others are round buttons.
 *
 * A fade from the page ground sits behind it so content scrolled underneath
 * never meets the bar's edge. The page leaves 130px under its content for it.
 */
export function CitizenBottomBar() {
  const { can } = usePermissions();
  const items = buildCitizenMobileNav(can);

  return (
    <div className="md:hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32.5 bg-linear-to-t from-[#e4ecf7] dark:from-ground from-45% to-[#e4ecf7]/0 dark:to-ground/0"
      />
      <nav
        aria-label="Main"
        className="@container/citizen-nav fixed inset-x-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40 flex h-17 items-center justify-between rounded-[34px] bg-card/94 p-2 shadow-[0_10px_30px_rgba(15,27,45,0.16)]"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <QuietLink
              key={item.id}
              to={item.url}
              aria-label={item.title}
              className={cn(
                "group/tab civic-press relative flex h-13 w-13 min-w-[44px] items-center justify-center gap-2 rounded-full text-portal-ink-2 outline-none focus-visible:ring-2 focus-visible:ring-primary",
                "data-[status=active]:bg-primary-fill data-[status=active]:text-white @min-[17rem]/citizen-nav:data-[status=active]:w-auto @min-[17rem]/citizen-nav:data-[status=active]:shrink-0 @min-[17rem]/citizen-nav:data-[status=active]:px-4.5",
              )}
            >
              <Icon className="size-5.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden text-sm font-semibold @min-[17rem]/citizen-nav:group-data-[status=active]/tab:inline">
                {SHORT_LABEL[item.id] ?? item.title}
              </span>
            </QuietLink>
          );
        })}
      </nav>
    </div>
  );
}
