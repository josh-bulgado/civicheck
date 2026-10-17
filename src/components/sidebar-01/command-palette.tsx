"use client";

import { ClipboardList, FileText, Loader2 } from "lucide-react";
import * as React from "react";
import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { cn } from "~/lib/utils";
import { usePermissions } from "~/hooks/usePermissions";
import { getStatusDetails } from "~/features/services/request-status";
import {
  formatFee,
  summarizeWait,
} from "~/features/services/service-utils";
import {
  searchEverythingFn,
  type SearchResults,
  type ServiceSearchHit,
} from "~/features/search/search.queries";
import { usePaletteDefaults } from "~/features/search/palette-defaults";
import { buildNavGroups } from "./nav-config";
import { PortalCommandPalette } from "./portal-command-palette";

const OPEN_EVENT = "civicheck:open-command-palette";

const EMPTY_RESULTS: SearchResults = { services: [], requests: [] };
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

type SearchStatus = "idle" | "loading" | "ready" | "error";

/** Call from anywhere (a search button, a search pill) to open the palette. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Secondary line for a service hit — case class, wait, and fee. */
function serviceMeta(service: ServiceSearchHit): string {
  const fee = formatFee(service.fee, service.displayGroup);
  return [
    service.classification
      ? capitalize(service.classification.replace(/_/g, " "))
      : null,
    summarizeWait(service.processingTime),
    /^\d/.test(fee) ? `₱${fee}` : fee,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The ⌘K search over services, requests and pages. Mounted once in the
 * dashboard layout rather than inside the sidebar: the sidebar unmounts while
 * its mobile sheet is closed, and the palette has to stay reachable from the
 * top bar either way.
 *
 * Applicants get the portal's rounded sheet (see PortalCommandPalette); CCRO
 * personnel keep the compact list below. Both share this state and search.
 */
export function CommandPalette({ userId = "" }: { userId?: string }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [status, setStatus] = React.useState<SearchStatus>("idle");
  const { can, role } = usePermissions();
  const navigate = useNavigate();
  const canViewAllRequests = can("requests:view_all");
  const items = buildNavGroups(role, can).flatMap((group) => group.items);
  const isApplicant = role === "applicant";
  const defaults = usePaletteDefaults(userId, open && isApplicant);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    const show = () => setOpen(true);
    document.addEventListener("keydown", down);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      document.removeEventListener("keydown", down);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  // The palette lives in the layout, which stays mounted across navigation, so
  // it would otherwise stay open (and keep its dimmed backdrop) over whatever
  // page the router lands on: browser Back, a link elsewhere, a redirect. Any
  // change of page closes it.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const lastPathname = React.useRef(pathname);
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    setStatus("idle");
  }, [pathname]);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY_RESULTS);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    const timer = setTimeout(async () => {
      try {
        const data = await searchEverythingFn({ data: { query: term } });
        if (cancelled) return;
        setResults(data);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setResults(EMPTY_RESULTS);
        setStatus("error");
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setStatus("idle");
    }
  }

  function selectRoute(url: string) {
    handleOpenChange(false);
    navigate({ to: url });
  }

  function selectService(routeCode: string) {
    handleOpenChange(false);
    navigate({ to: "/services", search: { service: routeCode } });
  }

  function selectRequest(requestId: string) {
    handleOpenChange(false);
    navigate({
      to: canViewAllRequests ? "/requests/$requestId" : "/my-requests/$requestId",
      params: { requestId },
    });
  }

  const isSearching = open && query.trim().length >= MIN_QUERY_LENGTH;
  const hasDataMatches =
    results.services.length > 0 || results.requests.length > 0;

  if (isApplicant) {
    return (
      <PortalCommandPalette
        open={open}
        onOpenChange={handleOpenChange}
        query={query}
        onQueryChange={setQuery}
        minQueryLength={MIN_QUERY_LENGTH}
        search={{ status, results }}
        defaults={defaults}
        onSelectRoute={selectRoute}
        onSelectService={selectService}
        onSelectRequest={selectRequest}
      />
    );
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      className="top-[10%] translate-y-0 sm:max-w-3xl"
    >
      <CommandInput
        placeholder="Search services, requests, pages..."
        value={query}
        onValueChange={setQuery}
      />

      {isSearching && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
        >
          {status === "loading" && (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Searching services and requests...
            </>
          )}
          {status === "error" && "Search is unavailable right now."}
          {status === "ready" && !hasDataMatches &&
            `No services or requests match "${query.trim()}".`}
        </div>
      )}

      <CommandList className="max-h-[min(62vh,34rem)] scroll-py-2">
        <CommandEmpty>No results found.</CommandEmpty>

        {results.services.length > 0 && (
          <CommandGroup heading="Services">
            {results.services.map((service) => (
              <CommandItem
                className="items-start py-2.5!"
                key={service.serviceCode}
                value={`service ${service.serviceCode} ${service.keywords}`}
                onSelect={() => selectService(service.routeCode)}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold leading-snug text-foreground">
                      {service.title}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {serviceMeta(service)}
                    </span>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.requests.length > 0 && (
          <CommandGroup heading="Requests">
            {results.requests.map((request) => {
              const status = getStatusDetails(request.status);
              return (
                <CommandItem
                  className="items-start py-2.5!"
                  key={request.id}
                  value={`request ${request.id} ${request.keywords}`}
                  onSelect={() => selectRequest(request.id)}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold leading-snug text-foreground">
                        {request.trackingNumber}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-snug text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              status.dot,
                            )}
                            aria-hidden="true"
                          />
                          {status.label}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {request.applicantName} · {request.serviceName}
                        </span>
                      </span>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        <CommandGroup heading="Navigation">
          {items.map((item) => (
            <CommandItem
              className="py-2.5!"
              key={item.id}
              onSelect={() => selectRoute(item.url)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span className="text-sm">{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
