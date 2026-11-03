"use client";

import * as React from "react";
import { useEffect } from "react";
import { useHotkey, type HotkeyChord } from "@tanstack/react-hotkeys";
import { useNavigate, useRouterState } from "@tanstack/react-router";

import { usePermissions } from "~/hooks/usePermissions";
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
import { type PaletteSearchStatus } from "./palette-sheet";
import { PortalCommandPalette } from "./portal-command-palette";
import { StaffCommandPalette } from "./staff-command-palette";

const OPEN_EVENT = "civicheck:open-command-palette";

/** Opens and closes the palette; the sidebar search shows the same key. */
export const PALETTE_HOTKEY: HotkeyChord = "Mod+K";

const EMPTY_RESULTS: SearchResults = { services: [], requests: [] };
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

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
 * Both roles get the same rounded sheet (see `PaletteSheet`): applicants their
 * requests and services (`PortalCommandPalette`), CCRO personnel services,
 * requests and pages (`StaffCommandPalette`). They share this state and search.
 */
export function CommandPalette({ userId = "" }: { userId?: string }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [status, setStatus] = React.useState<PaletteSearchStatus>("idle");
  const { can, role } = usePermissions();
  const navigate = useNavigate();
  const canViewAllRequests = can("requests:view_all");
  const items = buildNavGroups(role, can).flatMap((group) => group.items);
  const isApplicant = role === "applicant";
  const defaults = usePaletteDefaults(userId, open && isApplicant);

  useHotkey(PALETTE_HOTKEY, () => setOpen((open) => !open));

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
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
    <StaffCommandPalette
      open={open}
      onOpenChange={handleOpenChange}
      query={query}
      onQueryChange={setQuery}
      minQueryLength={MIN_QUERY_LENGTH}
      search={{ status, results }}
      pages={items}
      describeService={serviceMeta}
      onSelectRoute={selectRoute}
      onSelectService={selectService}
      onSelectRequest={selectRequest}
    />
  );
}
