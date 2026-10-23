import type { ReactNode } from "react";
import { groupFormData } from "~/features/requests/form-data-groups";

/** The slice of a request (applicant or staff view) this card reads. */
interface DetailsSource {
  formData: Record<string, string | number | boolean | null>;
  fieldLabels: Record<string, string>;
  eventDateLabel: string | null;
  eventPlaceLabel: string | null;
  referenceNumberLabel: string | null;
}

function formatKey(key: string) {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * `event_date`/`event_place`/`reference_number` carry a per-service label
 * (e.g. "Date of birth" for a birth service) configured in Admin → Services —
 * show that instead of the generic humanized key when the service set one.
 */
function formDataLabel(key: string, request: DetailsSource) {
  if (request.fieldLabels[key]) return request.fieldLabels[key];
  if (key === "event_date" && request.eventDateLabel) return request.eventDateLabel;
  if (key === "event_place" && request.eventPlaceLabel) return request.eventPlaceLabel;
  if (key === "reference_number" && request.referenceNumberLabel) {
    return request.referenceNumberLabel;
  }
  return formatKey(key);
}

// Answers that hold a date and are shown as "September 9, 2026".
const DATE_KEYS = new Set([
  "event_date",
  "death_date",
  "marriage_date",
  "record_date",
  "registered_late_when",
]);

function formatValue(key: string, value: string | number | boolean) {
  if (value === "") return "—";
  if (DATE_KEYS.has(key)) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  }
  return String(value);
}

/**
 * The "Submitted details" card shared by the applicant and staff request
 * pages: answers grouped by who/what they describe. `showEmpty` is for staff,
 * where a blank field is worth seeing; `children` renders below the groups.
 * `variant="portal"` is the applicant page's softer card; staff keep the default.
 */
export function SubmittedDetailsCard({
  request,
  showEmpty = false,
  variant = "dashboard",
  bare = false,
  layout = "stacked",
  compact = false,
  children,
}: {
  request: DetailsSource;
  showEmpty?: boolean;
  variant?: "dashboard" | "portal";
  bare?: boolean;
  /** `rows` puts each label beside its answer, under a small section title. */
  layout?: "stacked" | "rows";
  /**
   * For a narrow side panel: one column from `xl` up (the panel is too thin for
   * two) and sentence-case labels, which wrap far more readably than caps.
   */
  compact?: boolean;
  children?: ReactNode;
}) {
  const portal = variant === "portal";
  const groups = groupFormData(
    request.formData,
    (key) => formDataLabel(key, request),
    { includeEmpty: showEmpty },
  );

  const rows = layout === "rows";

  const list = rows ? (
    <div className="flex flex-col divide-y divide-border-light">
      {groups.map((group) => (
        <section key={group.id} className="py-5 first:pt-0 last:pb-0">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.title}
          </h3>
          <dl className="grid grid-cols-[minmax(7rem,38%)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            {group.rows.map(({ key, label, value }) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground capitalize break-words">
                  {formatValue(key, value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  ) : (
  <div
    className={
      portal
        ? "flex flex-col divide-y divide-border-lighter"
        : "flex flex-col divide-y divide-border"
    }
  >
    {groups.map((group) => (
      <div key={group.id} className="py-4 first:pt-0 last:pb-0">
        <h3
          className={
            portal
              ? "mb-3 text-base font-semibold text-foreground"
              : "mb-3 text-sm font-semibold text-foreground"
          }
        >
          {group.title}
        </h3>
        <dl
          className={
            compact
              ? "grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-1"
              : "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2"
          }
        >
          {group.rows.map(({ key, label, value }) => (
            <div key={key} className="min-w-0">
              <dt
                className={
                  compact
                    ? "mb-0.5 text-xs text-muted-foreground"
                    : "text-xs uppercase tracking-wide text-muted-foreground"
                }
              >
                {label}
              </dt>
              <dd
                className={
                  portal
                    ? "text-[17px] text-foreground capitalize break-words"
                    : "text-sm text-foreground capitalize break-words"
                }
              >
                {formatValue(key, value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    ))}
  </div>
  );

  // `bare` is just the grouped answers, for a panel that has its own heading.
  if (bare) return list;

  return (
    <section
      className={
        portal
          ? "rounded-[28px] bg-card p-6 shadow-portal-card ring-2 ring-border-light md:p-7"
          : "dashboard-panel p-6"
      }
    >
      <h2
        className={
          portal
            ? "mb-4 text-[22px] leading-[normal] font-semibold text-foreground"
            : "mb-4 text-lg font-bold text-foreground"
        }
      >
        Submitted details
      </h2>
      {list}
      {children}
    </section>
  );
}
