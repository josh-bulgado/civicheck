import { QuietLink } from "~/components/quiet-link";
import { ChevronRight } from "lucide-react";
import { cn } from "~/lib/utils";
import { pillButton } from "~/components/portal/styles";
import { useRealtimeRefresh } from "~/hooks/useRealtimeRefresh";
import { useContinuableApplication } from "~/features/apply/hooks/useApplyDraft";
import { useWelcomeTutorialAutoOpen } from "~/features/onboarding/components/WelcomeTutorial";
import { StatusPill } from "~/features/requests/components/StatusPill";
import { formatPesoFee } from "~/features/services/service-utils";
import { CitizenDashboardBodySkeleton } from "../CitizenDashboardSkeleton";
import { AttentionPanel } from "../components/AttentionPanel";
import { ContinueApplicationCard } from "../components/ContinueApplicationCard";
import { HeroRequestCard } from "../components/HeroRequestCard";
import { QuickStartPanel } from "../components/QuickStartPanel";
import { heroNote, pickHeroRequest } from "../hero";
import type { AttentionItem, CitizenDashboardRequest } from "../types";

interface CitizenDashboardProps {
  requests: CitizenDashboardRequest[];
  firstName: string;
  welcomeTutorialSeen: boolean;
}

/** Two sit beside the hero at most; "All requests" in the title row has the rest. */
const OTHER_REQUESTS_SHOWN = 2;

const CitizenDashboard = ({
  requests,
  firstName,
  welcomeTutorialSeen,
}: CitizenDashboardProps) => {
  // Keeps the page moving with the request; nothing on screen announces it.
  useRealtimeRefresh({ tables: ["requests"] });
  useWelcomeTutorialAutoOpen({ hasRequests: requests.length > 0, seen: welcomeTutorialSeen });
  // A draft is in this browser's storage, so a reload only learns of it once the
  // page has hydrated. Until then the body is a skeleton, not a page that gains a
  // card a moment later and pushes everything under it down.
  const { application, ready } = useContinuableApplication();

  const hasRequests = requests.length > 0;
  const hero = pickHeroRequest(requests);

  // The hero already speaks for its own request, so only the others are listed.
  const others = requests.filter((request) => request.id !== hero?.id);
  const incomplete = others.filter((r) => r.status === "incomplete");
  const paymentDue = others.filter(
    (r) => r.status === "ready_for_release" && r.payment_status !== "verified",
  );

  const attentionItems: AttentionItem[] = [
    ...incomplete.map((request) => ({
      request,
      tone: "warning" as const,
      message: "Missing requirements. Resubmit so validation can continue.",
      action: "Upload docs",
    })),
    ...paymentDue.map((request) => ({
      request,
      tone: "success" as const,
      // A fee-free request has nothing to pay, only a visit to confirm.
      message:
        Number(request.fees_due ?? 0) > 0
          ? `${formatPesoFee(request.fees_due)} due. Pay and claim at the CCRO cashier.`
          : heroNote(request),
      action: "View details",
    })),
  ];

  // Anything the attention card already names is not listed a second time.
  const attentionIds = new Set(attentionItems.map((item) => item.request.id));
  const otherRequests = others
    .filter((request) => !attentionIds.has(request.id))
    .slice(0, OTHER_REQUESTS_SHOWN);

  return (
    <div className="portal-page flex-1 gap-4.5 md:gap-5" aria-busy={!ready}>
      <div className="flex items-center justify-between gap-4 md:gap-6">
        <h1 className="portal-title min-w-0 max-md:truncate">
          Welcome back
          {firstName ? `, ${firstName}` : ""}
        </h1>
        {hasRequests && (
          <QuietLink to="/my-requests" className={cn(pillButton.light, "max-md:hidden")}>
            All requests
          </QuietLink>
        )}
      </div>

      {!ready ? (
        // Held back a beat, so a reload that hydrates straight away never shows
        // it; one that takes longer fades it in.
        <CitizenDashboardBodySkeleton
          prominent={!hasRequests}
          className="[--skeleton-delay:150ms]"
        />
      ) : (
        <div className="civic-content-in flex flex-1 flex-col gap-4.5 md:gap-5">
          {!hasRequests ? (
            <>
              <ContinueApplicationCard application={application} />
              <QuickStartPanel prominent />
            </>
          ) : (
            <>
              {hero ? (
                <HeroRequestCard request={hero} compact={otherRequests.length > 0} />
              ) : (
                <p className="rounded-[28px] bg-card px-5 py-7 text-[17px] text-body-strong shadow-portal-card md:px-8">
                  Nothing in progress — everything you've submitted has been released or
                  resolved.
                </p>
              )}
              {attentionItems.length > 0 && <AttentionPanel items={attentionItems} />}
              {otherRequests.length > 0 && <OtherRequests requests={otherRequests} />}
              <ContinueApplicationCard application={application} />
              <QuickStartPanel />
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** A quiet second row under the hero: name, status, and a way in. */
function OtherRequests({ requests }: { requests: CitizenDashboardRequest[] }) {
  return (
    <section aria-labelledby="other-requests-heading">
      <h2
        id="other-requests-heading"
        className="mb-2 px-1.5 text-[15px] leading-[normal] font-semibold text-muted-foreground"
      >
        Your other requests
      </h2>
      <ul className="civic-stagger grid gap-3 md:grid-cols-2 md:gap-4">
        {requests.map((request) => {
          const service =
            request.services_registry?.display_name ||
            request.services_registry?.name ||
            request.request_type;

          return (
            <li key={request.id}>
              <QuietLink
                to="/my-requests/$requestId"
                params={{ requestId: request.id }}
                className="civic-press flex items-center gap-4 rounded-4xl bg-card px-5 py-3.5 shadow-portal-card hover:bg-primary-tint md:gap-4 md:px-6 md:py-3"
              >
                <span className="min-w-0 flex-1 truncate text-[17px] leading-[normal] font-semibold text-foreground md:text-[18px]">
                  {service}
                </span>
                <StatusPill status={request.status} className="h-8 text-sm" />
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-portal-panel text-body-2"
                  aria-hidden="true"
                >
                  <ChevronRight className="size-4.5" />
                </span>
              </QuietLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CitizenDashboard;
