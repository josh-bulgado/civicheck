"use client";

import { Command as CommandPrimitive } from "cmdk";
import { formatShortDate } from "~/lib/date";
import type { PaletteDefaultsState } from "~/features/search/palette-defaults";
import type {
  RequestSearchHit,
  SearchResults,
  ServiceSearchHit,
} from "~/features/search/search.queries";
import {
  Highlight,
  PALETTE_GROUP as GROUP,
  PaletteEmpty,
  PaletteRow,
  type PaletteSearchStatus,
  PaletteSheet,
  RequestStatusLabel,
  RowChevron,
  RowSkeleton,
  SEARCH_FAILED_LINES,
  searchState,
} from "./palette-sheet";

interface PortalCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** Shortest term the server is asked about; shorter ones only narrow requests. */
  minQueryLength: number;
  search: { status: PaletteSearchStatus; results: SearchResults };
  defaults: { data: RequestSearchHit[] | null; state: PaletteDefaultsState };
  onSelectRoute: (url: string) => void;
  onSelectService: (routeCode: string) => void;
  onSelectRequest: (requestId: string) => void;
}

/** What the sheet lists: the three requests that matter before typing, a few of each once typing. */
const REQUESTS_BEFORE_TYPING = 3;
const REQUESTS_WHILE_TYPING = 2;
const SERVICES_WHILE_TYPING = 4;

function RequestRow({
  request,
  term,
  onSelect,
}: {
  request: RequestSearchHit;
  term: string;
  onSelect: () => void;
}) {
  const submitted = formatShortDate(request.createdAt);

  return (
    <PaletteRow
      value={`request-${request.id}`}
      onSelect={onSelect}
      title={<Highlight text={request.serviceName} term={term} />}
      subtitle={
        <>
          <Highlight text={request.trackingNumber} term={term} />
          {submitted ? ` · Submitted ${submitted}` : ""}
        </>
      }
      trailing={<RequestStatusLabel status={request.status} />}
    />
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
    <PaletteRow
      value={`service-${service.routeCode}`}
      onSelect={onSelect}
      title={<Highlight text={service.title} term={term} />}
      trailing={<RowChevron />}
    />
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
  const { searching, isLoading, failed, announcement } = searchState(
    term,
    minQueryLength,
    search.status,
  );

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
    ? SEARCH_FAILED_LINES
    : !needle
      ? ["Type to find a service or request."]
      : !searching
        ? ["Keep typing to search services"]
        : [`No results for ${term}`];

  return (
    <PaletteSheet
      open={open}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={onQueryChange}
      loading={isLoading}
      announcement={announcement}
      description="Search your requests and services. Use the arrow keys to move and Enter to open."
    >
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

      {showEmpty ? <PaletteEmpty lines={emptyLines} failed={failed} /> : null}
    </PaletteSheet>
  );
}
