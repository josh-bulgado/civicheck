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

function formatValue(key: string, value: string | number | boolean) {
  if (value === "") return "—";
  if (key === "event_date") {
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
 */
export function SubmittedDetailsCard({
  request,
  showEmpty = false,
  children,
}: {
  request: DetailsSource;
  showEmpty?: boolean;
  children?: ReactNode;
}) {
  const groups = groupFormData(
    request.formData,
    (key) => formDataLabel(key, request),
    { includeEmpty: showEmpty },
  );

  return (
    <section className="dashboard-panel p-6">
      <h2 className="mb-4 text-lg font-bold text-foreground">Submitted details</h2>
      <div className="flex flex-col divide-y divide-border">
        {groups.map((group) => (
          <div key={group.id} className="py-4 first:pt-0 last:pb-0">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{group.title}</h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {group.rows.map(({ key, label, value }) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="text-sm text-foreground capitalize">
                    {formatValue(key, value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {children}
    </section>
  );
}
