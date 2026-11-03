"use client";

import { Fragment, type ReactNode } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Search } from "lucide-react";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";
import { getStatusDetails } from "~/features/requests/request-workflow";

/**
 * The look of the ⌘K search, shared by every role: a rounded sheet with a pill
 * search field, soft rows and calm empty states. What goes in the list, and what
 * selecting it does, belongs to the caller (`PortalCommandPalette` for
 * applicants, `StaffCommandPalette` for CCRO personnel).
 */

/** "Ready for Release" → "Ready for release": the palette reads as sentences. */
export function sentenceCase(label: string): string {
  return label.charAt(0) + label.slice(1).toLowerCase();
}

// Ink for a request's state: a dot and the words beside it. Three kinds are
// told apart: ready (green), processing (violet), anything else still moving
// (blue); finished ones fall back to grey.
const INK = {
  ready: { dot: "bg-[#1f8a5b] dark:bg-success", text: "text-tone-success" },
  processing: {
    dot: "bg-[#4a3b8f] dark:bg-tone-progress",
    text: "text-tone-progress",
  },
  moving: {
    dot: "bg-[#0b4da2] dark:bg-primary",
    text: "text-accent-foreground",
  },
  done: { dot: "bg-[#9aa5b5] dark:bg-muted-foreground", text: "text-muted-2" },
} as const;

export function inkFor(status: string) {
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
export const PALETTE_GROUP =
  "**:[[cmdk-group-heading]]:px-4.5 **:[[cmdk-group-heading]]:pt-4 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:text-sm **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:text-muted-2";

const PALETTE_ROW =
  "flex min-h-13 cursor-default items-center gap-4 rounded-2xl px-4.5 py-2.5 outline-none transition-colors duration-100 select-none data-selected:bg-portal-panel";

export type PaletteSearchStatus = "idle" | "loading" | "ready" | "error";

/**
 * What a search's status means for the sheet: whether to show skeletons, the
 * "unavailable" message, and what a screen reader is told. A term shorter than
 * `minQueryLength` is never sent to the server, so it is never loading or failed.
 */
export function searchState(
  term: string,
  minQueryLength: number,
  status: PaletteSearchStatus,
) {
  const searching = term.length >= minQueryLength;
  const isLoading = searching && status === "loading";
  const failed = searching && status === "error";
  return {
    searching,
    isLoading,
    failed,
    announcement: isLoading
      ? "Searching"
      : failed
        ? "Search is unavailable"
        : "",
  };
}

/** The empty and failed message: first line, then what to do about it. */
export const SEARCH_FAILED_LINES = [
  "Search is unavailable right now",
  "Please try again in a moment.",
];

/** The state of a request, as a coloured dot and the words beside it. */
export function RequestStatusLabel({ status }: { status: string }) {
  const ink = inkFor(status);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-2 text-sm font-semibold",
        ink.text,
      )}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", ink.dot)}
        aria-hidden="true"
      />
      {sentenceCase(getStatusDetails(status).label)}
    </span>
  );
}

interface PaletteRowProps {
  /** Unique among the rows; the list's keyboard selection is keyed on it. */
  value: string;
  onSelect: () => void;
  /** Before the title, for rows that are a kind of thing (a page). */
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** After the title: a status, or the arrow that says it opens. */
  trailing?: ReactNode;
}

/** One result: an optional icon, a title over a smaller subtitle, and what follows them. */
export function PaletteRow({
  value,
  onSelect,
  icon,
  title,
  subtitle,
  trailing,
}: PaletteRowProps) {
  return (
    <CommandPrimitive.Item
      value={value}
      onSelect={onSelect}
      className={PALETTE_ROW}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16.5px] leading-snug font-medium text-foreground">
          {title}
        </span>
        {subtitle ? (
          <span className="block truncate text-[13px] leading-snug text-muted-2">
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing}
    </CommandPrimitive.Item>
  );
}

/** A short message in the list: nothing found, or the search failed. */
export function PaletteEmpty({
  lines,
  failed,
}: {
  lines: string[];
  failed: boolean;
}) {
  return (
    <div className="px-4.5 py-4.5">
      {lines.map((line, index) => (
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
  );
}

/** The part of `text` the person typed, in the brand blue. */
export function Highlight({ text, term }: { text: string; term: string }) {
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

/** Same silhouette as a request row, so the list doesn't jump when data lands. */
export function RowSkeleton({ count }: { count: number }) {
  return (
    <div role="status" aria-label="Loading" className="pt-4">
      <ul aria-hidden="true" className="flex flex-col">
        {Array.from({ length: count }, (_, index) => (
          <li
            key={index}
            className="flex min-h-13 items-center gap-4 px-4.5 py-2.5"
          >
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

interface PaletteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  /** Shows skeleton rows while search results load. */
  loading: boolean;
  /** Read out by screen readers when it changes: "Searching", an error, or nothing. */
  announcement: string;
  /** Spoken to assistive tech when the sheet opens. */
  description: string;
  children: ReactNode;
}

/**
 * The sheet itself: backdrop, popup, pill search field and the scrolling list.
 * Filtering is the caller's (`shouldFilter` is off), so what the list shows is
 * exactly what `children` renders.
 */
export function PaletteSheet({
  open,
  onOpenChange,
  query,
  onQueryChange,
  loading,
  announcement,
  description,
  children,
}: PaletteSheetProps) {
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
            {description}
          </DialogDescription>

          <CommandPrimitive
            shouldFilter={false}
            loop
            label="Search CiviCheck"
            className="flex flex-col"
          >
            <div className="flex h-14 items-center gap-3 rounded-full bg-portal-panel px-5">
              <Search
                className="size-5 shrink-0 text-muted-2"
                aria-hidden="true"
              />
              <CommandPrimitive.Input
                value={query}
                onValueChange={onQueryChange}
                placeholder="Search"
                className="min-w-0 flex-1 bg-transparent text-[17px] text-foreground outline-none placeholder:text-[#7a8696] dark:placeholder:text-muted-foreground"
              />
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
                {announcement}
              </div>
              {loading ? (
                <div
                  role="status"
                  aria-label="Searching CiviCheck"
                  className="space-y-4 px-4 py-5"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      aria-hidden="true"
                      className="flex items-center gap-3"
                    >
                      <Skeleton className="size-9 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                children
              )}
            </CommandPrimitive.List>
          </CommandPrimitive>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
