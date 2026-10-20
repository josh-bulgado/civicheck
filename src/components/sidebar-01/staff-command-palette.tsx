"use client";

import { Command as CommandPrimitive } from "cmdk";
import type {
  RequestSearchHit,
  SearchResults,
  ServiceSearchHit,
} from "~/features/search/search.queries";
import type { NavItem } from "./types";
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

interface StaffCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** Shortest term the server is asked about; shorter ones only narrow the pages. */
  minQueryLength: number;
  search: { status: PaletteSearchStatus; results: SearchResults };
  /** The pages this role can open, in sidebar order. */
  pages: NavItem[];
  /** A service's secondary line: its class, wait and fee. */
  describeService: (service: ServiceSearchHit) => string;
  onSelectRoute: (url: string) => void;
  onSelectService: (routeCode: string) => void;
  onSelectRequest: (requestId: string) => void;
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
  return (
    <PaletteRow
      value={`request-${request.id}`}
      onSelect={onSelect}
      title={<Highlight text={request.trackingNumber} term={term} />}
      subtitle={
        <>
          <Highlight text={request.applicantName} term={term} />
          {" · "}
          <Highlight text={request.serviceName} term={term} />
        </>
      }
      trailing={<RequestStatusLabel status={request.status} />}
    />
  );
}

function ServiceRow({
  service,
  meta,
  term,
  onSelect,
}: {
  service: ServiceSearchHit;
  meta: string;
  term: string;
  onSelect: () => void;
}) {
  return (
    <PaletteRow
      value={`service-${service.routeCode}`}
      onSelect={onSelect}
      title={<Highlight text={service.title} term={term} />}
      subtitle={meta}
      trailing={<RowChevron />}
    />
  );
}

function PageRow({
  page,
  term,
  onSelect,
}: {
  page: NavItem;
  term: string;
  onSelect: () => void;
}) {
  const Icon = page.icon;

  return (
    <PaletteRow
      value={`page-${page.id}`}
      onSelect={onSelect}
      icon={<Icon className="size-5 shrink-0 text-muted-2" aria-hidden="true" />}
      title={<Highlight text={page.title} term={term} />}
      trailing={<RowChevron />}
    />
  );
}

/**
 * The CCRO search: the same sheet applicants get, holding the services and
 * requests that match and the pages this role can open. Its data and navigation
 * come from `CommandPalette`; this is only what the list shows. The pages are
 * listed before anything is typed (jumping around is what ⌘K is mostly for) and
 * narrow as you type; services and requests come from the server.
 */
export function StaffCommandPalette({
  open,
  onOpenChange,
  query,
  onQueryChange,
  minQueryLength,
  search,
  pages,
  describeService,
  onSelectRoute,
  onSelectService,
  onSelectRequest,
}: StaffCommandPaletteProps) {
  const term = query.trim();
  const needle = term.toLowerCase();
  const { searching, isLoading, failed, announcement } = searchState(
    term,
    minQueryLength,
    search.status,
  );

  const { services, requests } = searching
    ? search.results
    : { services: [], requests: [] };
  const matchedPages = needle
    ? pages.filter((page) => page.title.toLowerCase().includes(needle))
    : pages;

  const anyResults = services.length + requests.length + matchedPages.length > 0;
  const showEmpty = !anyResults && !isLoading;

  return (
    <PaletteSheet
      open={open}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={onQueryChange}
      loading={isLoading}
      announcement={announcement}
      description="Search services, requests and pages. Use the arrow keys to move and Enter to open."
    >
      {isLoading && services.length + requests.length === 0 ? (
        <RowSkeleton count={2} />
      ) : null}

      {failed ? <PaletteEmpty lines={SEARCH_FAILED_LINES} failed /> : null}

      {services.length > 0 ? (
        <CommandPrimitive.Group heading="Services" className={GROUP}>
          {services.map((service) => (
            <ServiceRow
              key={service.routeCode}
              service={service}
              meta={describeService(service)}
              term={term}
              onSelect={() => onSelectService(service.routeCode)}
            />
          ))}
        </CommandPrimitive.Group>
      ) : null}

      {requests.length > 0 ? (
        <CommandPrimitive.Group heading="Requests" className={GROUP}>
          {requests.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              term={term}
              onSelect={() => onSelectRequest(request.id)}
            />
          ))}
        </CommandPrimitive.Group>
      ) : null}

      {matchedPages.length > 0 ? (
        <CommandPrimitive.Group heading="Pages" className={GROUP}>
          {matchedPages.map((page) => (
            <PageRow
              key={page.id}
              page={page}
              term={term}
              onSelect={() => onSelectRoute(page.url)}
            />
          ))}
        </CommandPrimitive.Group>
      ) : null}

      {showEmpty && !failed ? (
        <PaletteEmpty lines={[`No results for ${term}`]} failed={false} />
      ) : null}
    </PaletteSheet>
  );
}
