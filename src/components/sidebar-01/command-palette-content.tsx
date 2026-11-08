"use client";

import * as React from "react";
import { useNavigate } from "@tanstack/react-router";

import { usePermissions } from "~/hooks/usePermissions";
import { formatFee, summarizeWait } from "~/features/services/service-utils";
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

const EMPTY_RESULTS: SearchResults = { services: [], requests: [] };
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

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

export function CommandPaletteContent({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [status, setStatus] = React.useState<PaletteSearchStatus>("idle");
  const { can, role } = usePermissions();
  const navigate = useNavigate();
  const canViewAllRequests = can("requests:view_all");
  const items = buildNavGroups(role, can).flatMap((group) => group.items);
  const isApplicant = role === "applicant";
  const defaults = usePaletteDefaults(userId, open && isApplicant);

  React.useEffect(() => {
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
    onOpenChange(next);
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
