import { QuietLink } from "~/components/quiet-link";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { staggerStyle } from "~/components/motion/stagger";
import { pillButton } from "~/components/portal/styles";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { StatusPill } from "~/features/requests/components/StatusPill";
import { STAGES } from "~/features/requests/request-queue";
import {
  TERMINAL_STATUSES,
  getStatusDetails,
  stageOf,
} from "~/features/requests/request-workflow";
import type {
  RequestServiceName,
  getMyRequestsFn,
} from "~/features/requests/applicant-requests.queries";
import { cn } from "~/lib/utils";

interface MyRequestsPageProps {
  requests: Awaited<ReturnType<typeof getMyRequestsFn>>;
  /** Requests with an update the applicant has not read: the sidebar badge's own source. */
  unreadRequestIds: string[];
}

type MyRequest = MyRequestsPageProps["requests"][number];
type StatusVariant = ReturnType<typeof getStatusDetails>["variant"];

// Filled stage segments take the status pill's ink, so the bar and the pill
// beside it read as one thing.
const STAGE_FILL: Record<StatusVariant, string> = {
  info: "bg-tone-review",
  progress: "bg-tone-progress",
  warning: "bg-tone-warning",
  success: "bg-tone-success",
  destructive: "bg-tone-danger",
  // A released request is done: its bar stays full but steps back.
  neutral: "bg-tone-neutral/50",
};

type GroupId = "ready" | "progress" | "completed";

const GROUPS: { id: GroupId; label: string }[] = [
  { id: "ready", label: "Ready to claim" },
  { id: "progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

/**
 * Where a request sits on the page. Ready-for-release is its own group because
 * it is the one that needs the applicant to act (pay and claim). Anything that
 * isn't terminal and isn't ready, including a status this build doesn't know,
 * counts as in progress.
 */
function groupOf(status: string | null): GroupId {
  if (status === "ready_for_release") return "ready";
  if ((TERMINAL_STATUSES as readonly string[]).includes(status ?? "")) return "completed";
  return "progress";
}

function serviceName(request: {
  services_registry?: RequestServiceName | null;
  request_type: string | null;
}): string {
  return (
    request.services_registry?.display_name ||
    request.services_registry?.name ||
    request.request_type ||
    "Request"
  );
}

export default function MyRequestsPage({ requests, unreadRequestIds }: MyRequestsPageProps) {
  const unread = new Set(unreadRequestIds);

  // Newest first inside each group, whatever order the loader hands them in.
  const newestFirst = [...requests].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );
  const filled = GROUPS.map((group) => ({
    ...group,
    items: newestFirst.filter((request) => groupOf(request.status) === group.id),
  })).filter((group) => group.items.length > 0);

  // `start` is the group's first row number on the page, so the entrance
  // cascades down all three groups instead of restarting at every heading.
  const groups = filled.map((group, index) => ({
    ...group,
    start: filled
      .slice(0, index)
      .reduce((count, earlier) => count + earlier.items.length, 0),
  }));

  return (
    <div className="portal-page gap-4.5 md:gap-7">
      <div className="flex items-center justify-between gap-x-6 gap-y-3">
        <h1 className="portal-title">My requests</h1>
        {/* A round "+" on a phone: the title already says what this page is. */}
        <QuietLink
          to="/services"
          aria-label="New request"
          className={cn(
            buttonVariants(),
            pillButton.primary,
            "h-14 gap-2.5 px-7 text-base shadow-portal-button max-md:size-12 max-md:gap-0 max-md:px-0",
          )}
        >
          <Plus className="size-4.5 max-md:size-5.5" aria-hidden="true" />
          <span className="max-md:sr-only">New request</span>
        </QuietLink>
      </div>

      {requests.length === 0 ? (
        <Empty className="civic-enter-scale gap-5 rounded-[28px] bg-card px-8 py-16 shadow-portal-card">
          <EmptyHeader className="max-w-110 gap-3">
            <EmptyMedia
              variant="icon"
              className="size-13 rounded-[14px] bg-primary-soft text-primary"
            >
              <FileText />
            </EmptyMedia>
            <EmptyTitle className="text-xl font-bold">No requests yet</EmptyTitle>
            <EmptyDescription className="leading-[1.55]">
              You haven't submitted any civil registry requests yet.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <QuietLink
              to="/services"
              className={cn(buttonVariants({ variant: "outline" }), pillButton.outline)}
            >
              Browse services
            </QuietLink>
          </EmptyContent>
        </Empty>
      ) : (
        // The rows lay themselves out from this container's width, not the
        // window's: the sidebar takes a fixed share of the window, so the same
        // viewport can leave the list wide or narrow depending on it.
        <div className="@container flex flex-col gap-4.5 md:gap-7">
          {groups.map((group) => {
            const headingId = `requests-${group.id}`;

            return (
              <section key={group.id} aria-labelledby={headingId}>
                <h2
                  id={headingId}
                  className="mb-2.5 px-1 text-[15px] leading-[normal] font-semibold text-muted-foreground md:mb-3 md:px-1.5 md:text-base"
                >
                  {group.label}
                </h2>
                <ul className="civic-stagger divide-y divide-border-lighter overflow-hidden rounded-4xl bg-card shadow-portal-card ring-2 ring-border-light md:rounded-[28px]">
                  {group.items.map((request, index) => (
                    <li key={request.id} style={staggerStyle(group.start + index)}>
                      <RequestRow request={request} isNew={unread.has(request.id)} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * One request: name over tracking number, the four stage segments, the status
 * pill and a chevron. The whole row is the link to the request's detail page.
 *
 * Wide, it is a single line. Narrow, the name and chevron keep the first line
 * and the segments and pill drop under them.
 *
 * Two things set a row apart, and only these: an update the applicant has not
 * read (a blue wash and a "New" pill), and a request waiting on them (a red
 * line, and the red pill and segments that come with Incomplete).
 */
function RequestRow({ request, isNew }: { request: MyRequest; isNew: boolean }) {
  const needsAction = request.status === "incomplete";

  return (
    <QuietLink
      to="/my-requests/$requestId"
      params={{ requestId: request.id }}
      className={cn(
        "civic-interactive civic-nudge grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3.5 px-5 py-4.5 max-md:gap-x-3 max-md:gap-y-2.5 max-md:px-4.5 max-md:py-4 @3xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] @3xl:gap-x-7 @3xl:px-8 @3xl:py-5.5",
        isNew ? "bg-(image:--portal-unread-highlight)" : "hover:bg-foreground/3",
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3 max-md:items-start max-md:gap-2">
          <p
            className={cn(
              "min-w-0 truncate text-[17px] leading-snug text-foreground max-md:leading-[1.28] max-md:whitespace-normal @3xl:text-[19px]",
              isNew ? "font-bold" : "font-semibold",
            )}
          >
            {serviceName(request)}
          </p>
          {isNew && (
            <span className="inline-flex h-6.5 shrink-0 items-center rounded-full bg-primary px-3 text-[13px] font-bold text-white max-md:h-6 max-md:px-2.5 max-md:text-xs">
              New
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-sm text-muted-foreground max-md:text-[13px]">
          {request.tracking_number}
        </p>
        {needsAction && (
          <p className="mt-1 text-sm font-semibold text-destructive">
            Upload one more document
          </p>
        )}
      </div>

      {/* Wide, this wrapper steps out of the way so its two children sit in the
          row's own columns; narrow, it is the second line. */}
      <div className="col-span-2 flex flex-wrap items-center gap-x-5 gap-y-2 max-md:col-span-1 max-md:col-start-1 max-md:row-start-2 @3xl:contents">
        {/* The segments are for a wider row: a phone's has the pill alone. */}
        <span className="max-md:hidden">
          <StageSegments status={request.status} />
        </span>
        <StatusPill
          status={request.status}
          className="max-md:h-8 max-md:px-3.25 max-md:text-sm @3xl:w-50 @3xl:justify-start"
        />
      </div>

      <span
        className="col-start-2 row-start-1 flex size-11 items-center justify-center rounded-full bg-portal-panel text-body-2 max-md:row-span-2 max-md:size-10 @3xl:col-start-4"
        aria-hidden="true"
      >
        <ChevronRight className="size-4.5" />
      </span>
    </QuietLink>
  );
}

/**
 * Where a request sits in the four-stage workflow: one segment per stage,
 * filled up to the current one. Decorative: the pill beside it says the same
 * thing in words.
 */
function StageSegments({ status }: { status: string | null }) {
  const stage = stageOf(status);
  // Incomplete is the one state that is the applicant's move, so it is red here
  // and on its pill; the other statuses keep the ink their pill wears.
  const fill =
    status === "incomplete" ? "bg-destructive" : STAGE_FILL[getStatusDetails(status).variant];

  return (
    <span className="flex gap-1.25" aria-hidden="true">
      {STAGES.map((step) => (
        <span
          key={step}
          className={cn(
            "h-1.75 w-10 rounded-[4px]",
            stage && step <= stage ? fill : "bg-border-light",
          )}
        />
      ))}
    </span>
  );
}
