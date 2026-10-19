"use client";

import { Fragment } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronRight, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { formatShortDate } from "~/lib/date";
import type { PaletteDefaultsState } from "~/features/search/palette-defaults";
import type {
  RequestSearchHit,
  SearchResults,
  ServiceSearchHit,
} from "~/features/search/search.queries";
import { getStatusDetails } from "~/features/requests/request-workflow";

export type PortalSearchStatus = "idle" | "loading" | "ready" | "error";

interface PortalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** Shortest term the server is asked about; shorter ones only narrow requests. */
  minQueryLength: number;
  search: { status: PortalSearchStatus; results: SearchResults };
  defaults: { data: RequestSearchHit[] | null; state: PaletteDefaultsState };
  onSelectRoute: (url: string) => void;
  onSelectService: (routeCode: string) => void;
  onSelectRequest: (requestId: string) => void;
}

/** What the sheet lists: the three requests that matter before typing, a few of each once typing. */
const REQUESTS_BEFORE_TYPING = 3;
const REQUESTS_WHILE_TYPING = 2;
const SERVICES_WHILE_TYPING = 4;

/** "Ready for Release" → "Ready for release": the palette reads as sentences. */
function sentenceCase(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase();
}

// Ink for a request's state: a dot and the words beside it. Three kinds are
// told apart: ready (green), processing (violet), anything else still moving
// (blue); finished ones fall back to grey.
const INK = {
  ready: { dot: "bg-[#1f8a5b] dark:bg-success", text: "text-tone-success" },
  processing: { dot: "bg-[#4a3b8f] dark:bg-tone-progress", text: "text-tone-progress" },
  moving: { dot: "bg-[#0b4da2] dark:bg-primary", text: "text-accent-foreground" },
  done: { dot: "bg-[#9aa5b5] dark:bg-muted-foreground", text: "text-muted-2" },
} as const;

function inkFor(status: string) {
  switch (status) {
    case "ready_for_release":
      return INK.ready;
    case "processing":
      return INK.processing;
    case "submitted":
    case "under_validation":
    case "incomplete":
      return INK.moving;
    default:
      return INK.done;
  }
}

// This sheet is portaled outside the portal's wrapper, so the softer secondary
// ink is spelled out here rather than read from the token it would override.
const GROUP =
  "**:[[cmdk-group-heading]]:px-4.5 **:[[cmdk-group-heading]]:pt-4 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:text-sm **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-muted-2";

const ROW =
  "flex min-h-13 cursor-default items-center gap-4 rounded-2xl px-4.5 py-2.5 outline-none transition-colors duration-100 select-none data-selected:bg-portal-panel";

/** The part of `text` the person typed, in the brand blue. */
function Highlight({ text, term }: { text: string; term: string }) {
  const needle = term.trim();
  if (!needle) return <>{text}</>;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The capture group makes `split` keep the matches, at the odd positions.
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="bg-transparent font-bold text-primary">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function RequestRow({
  request,
  term,
  onSelect,
}: {
  request: RequestSearchHit;
  term: string;
  onSelect: () => void;
}) {
  const ink = inkFor(request.status);
  const submitted = formatShortDate(request.createdAt);

  return (
    <CommandPrimitive.Item
      value={`request-${request.id}`}
      onSelect={onSelect}
      className={ROW}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16.5px] leading-snug font-medium text-foreground">
          <Highlight text={request.serviceName} term={term} />
        </span>
        <span className="block truncate text-[13px] leading-snug text-muted-2">
          <Highlight text={request.trackingNumber} term={term} />
          {submitted ? ` · Submitted ${submitted}` : ""}
        </span>
      </span>
      <span
        className={cn("flex shrink-0 items-center gap-2 text-sm font-semibold", ink.text)}
      >
        <span className={cn("size-2 shrink-0 rounded-full", ink.dot)} aria-hidden="true" />
        {sentenceCase(getStatusDetails(request.status).label)}
      </span>
    </CommandPrimitive.Item>
  );
}

function ServiceRow({
  service,
  term,
  onSelect,
}: {
  service: ServiceSearchHit;
  term: string;
  onSelect: () => void;
}) {
  return (
    <CommandPrimitive.Item
      value={`service-${service.routeCode}`}
      onSelect={onSelect}
      className={ROW}
    >
      <span className="min-w-0 flex-1 truncate text-[16.5px] leading-snug font-medium text-foreground">
        <Highlight text={service.title} term={term} />
      </span>
      <ChevronRight className="size-4.5 shrink-0 text-[#7a8696] dark:text-muted-foreground" aria-hidden="true" />
    </CommandPrimitive.Item>
  );
}

/** Same silhouette as a request row, so the list doesn't jump when data lands. */
function RowSkeleton({ count }: { count: number }) {
  return (
    <div role="status" aria-label="Loading" className="pt-4">
      <ul aria-hidden="true" className="flex flex-col">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="flex min-h-13 items-center gap-4 px-4.5 py-2.5">
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="civic-skeleton block h-4 w-1/2 rounded-full" />
              <span className="civic-skeleton block h-3 w-2/5 rounded-full" />
            </span>
            <span className="civic-skeleton block h-4 w-24 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The applicant's search: a rounded sheet holding their requests and the
 * services that match. Its data and navigation come from `CommandPalette`; this
 * is only the look, so the staff palette keeps its own without the two drifting
 * apart in logic.
 */
export function PortalCommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  minQueryLength,
  search,
  defaults,
  onSelectRoute,
  onSelectService,
  onSelectRequest,
}: PortalCommandPaletteProps) {
  const term = query.trim();
  const needle = term.toLowerCase();
  const searching = term.length >= minQueryLength;
  const isLoading = searching && search.status === "loading";
  const failed = searching && search.status === "error";

  const serverHits = search.results.requests.length + search.results.services.length;
  // Until the server answers a fresh term, keep narrowing what is already on
  // screen instead of blanking it for a skeleton.
  const fromServer =
    searching && (search.status === "ready" || search.status === "error" || serverHits > 0);

  const latest = defaults.data ?? [];
  const matchedRequests = fromServer
    ? search.results.requests
    : needle
      ? latest.filter((request) => request.keywords.includes(needle))
      : latest;
  const requests = matchedRequests.slice(
    0,
    needle ? REQUESTS_WHILE_TYPING : REQUESTS_BEFORE_TYPING,
  );
  // Services are only ever matched by the server, so there are none to show
  // before a term is long enough to ask.
  const services = (fromServer ? search.results.services : []).slice(0, SERVICES_WHILE_TYPING);

  const anyResults = requests.length + services.length > 0;
  const waitingOnDefaults = !needle && defaults.data === null && defaults.state === "loading";
  const showSeeAll = !needle && requests.length > 0;
  const showEmpty = !anyResults && !waitingOnDefaults && !isLoading;

  const emptyLines: string[] = failed
    ? ["Search is unavailable right now", "Please try again in a moment."]
    : !needle
      ? ["Type to find a service or request."]
      : !searching
        ? ["Keep typing to search services"]
        : [`No results for ${term}`];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        {/* Base UI unmounts the whole dialog when the popup's exit animation ends,
            so the backdrop has to run the same length and hold its end state:
            at the dialog default of 100ms against the popup's 150ms it finished
            first, snapped back to full dim, and flashed until the unmount. */}
        <DialogOverlay className="bg-[rgba(15,27,45,0.24)] backdrop-blur-sm duration-150 data-closed:fill-mode-forwards" />
        <DialogPrimitive.Popup
          data-slot="portal-command-palette"
          className="fixed top-14 left-1/2 z-50 w-[min(35rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-hidden rounded-panel bg-card p-2.5 pb-3 text-foreground shadow-[0_30px_80px_rgba(15,27,45,0.28),0_0_0_1px_rgba(15,27,45,0.05)] duration-150 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:fill-mode-forwards"
        >
          <DialogTitle className="sr-only">Search CiviCheck</DialogTitle>
          <DialogDescription className="sr-only">
            Search your requests and services. Use the arrow keys to move and Enter to open.
          </DialogDescription>

          <CommandPrimitive
            shouldFilter={false}
            loop
            label="Search CiviCheck"
            className="flex flex-col"
          >
            <div className="flex h-14 items-center gap-3 rounded-full bg-portal-panel px-5">
              <Search className="size-5 shrink-0 text-muted-2" aria-hidden="true" />
              <CommandPrimitive.Input
                value={query}
                onValueChange={onQueryChange}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-[#7a8696] dark:placeholder:text-muted-foreground"
              />
              {isLoading ? (
                <Loader2
                  className="size-4.5 shrink-0 animate-spin text-[#7a8696] dark:text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
              {/* Plain text, not a key cap: Escape is not the thing to reach for. */}
              <span
                className="shrink-0 text-[13px] font-semibold text-[#7a8696] dark:text-muted-foreground"
                aria-hidden="true"
              >
                Esc
              </span>
            </div>

            <CommandPrimitive.List className="max-h-[min(68vh,36rem)] scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-contain outline-none scrollbar-thin [scrollbar-color:var(--border-light)_transparent]">
              <div role="status" aria-live="polite" className="sr-only">
                {isLoading ? "Searching" : failed ? "Search is unavailable" : ""}
              </div>

              {waitingOnDefaults ? <RowSkeleton count={3} /> : null}
              {isLoading && !anyResults ? <RowSkeleton count={2} /> : null}

              {requests.length > 0 ? (
                <CommandPrimitive.Group heading="Your requests" className={GROUP}>
                  {requests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      term={term}
                      onSelect={() => onSelectRequest(request.id)}
                    />
                  ))}
                  {showSeeAll ? (
                    <CommandPrimitive.Item
                      value="see-all-requests"
                      onSelect={() => onSelectRoute("/my-requests")}
                      className="flex cursor-default items-center rounded-2xl px-4.5 pt-2.5 pb-0.5 text-[15px] font-semibold text-primary outline-none data-selected:bg-portal-panel"
                    >
                      See all requests <span aria-hidden="true">&nbsp;→</span>
                    </CommandPrimitive.Item>
                  ) : null}
                </CommandPrimitive.Group>
              ) : null}

              {services.length > 0 ? (
                <CommandPrimitive.Group heading="Services" className={GROUP}>
                  {services.map((service) => (
                    <ServiceRow
                      key={service.routeCode}
                      service={service}
                      term={term}
                      onSelect={() => onSelectService(service.routeCode)}
                    />
                  ))}
                </CommandPrimitive.Group>
              ) : null}

              {showEmpty ? (
                <div className="px-4.5 py-4.5">
                  {emptyLines.map((line, index) => (
                    <p
                      key={line}
                      className={cn(
                        "text-[15px] text-muted-2",
                        index === 0 && failed && "font-semibold text-foreground",
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
