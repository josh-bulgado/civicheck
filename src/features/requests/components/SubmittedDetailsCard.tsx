import type { ReactNode } from "react";
import { groupFormData } from "~/features/requests/form-data-groups";
import { formDataLabel, formatFormDataValue, type DetailsSource } from "~/features/requests/form-data-display";
import { cn } from "~/lib/utils";

function dialogFieldLabel(label: string) {
  // Keep acronyms such as PSA and ID while using sentence case for words.
  return label.replace(/\b[A-Z][a-z]+(?:['’][a-z]+)?\b/g, (word, offset: number) =>
    offset === 0 ? word : word.toLowerCase(),
  );
}

/**
 * The "Submitted details" card shared by the applicant and staff request
 * pages: answers grouped by who/what they describe. `showEmpty` is for staff,
 * where a blank field is worth seeing; `children` renders below the groups.
 * `dialog` uses compact, sentence-case fields for the applicant's full view.
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
  variant?: "dashboard" | "portal" | "dialog";
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
  const dialog = variant === "dialog";
  const groups = groupFormData(
    request.formData,
    (key) => {
      const label = formDataLabel(key, request);
      // Authored labels may contain proper nouns, such as Legazpi City.
      return dialog && !request.fieldLabels[key] ? dialogFieldLabel(label) : label;
    },
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
                <dd className="font-medium text-foreground break-words">
                  {formatFormDataValue(key, value, request)}
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
      portal || dialog
        ? "flex flex-col divide-y divide-border-lighter"
        : "flex flex-col divide-y divide-border"
    }
  >
    {groups.map((group) => (
      <div key={group.id} className="py-4 first:pt-0 last:pb-0">
        <h3
          className={
            dialog
              ? "mb-3 text-sm leading-[18px] font-semibold text-foreground"
              : portal
              ? "mb-3 text-base font-semibold text-foreground"
              : "mb-3 text-sm font-semibold text-foreground"
          }
        >
          {group.title}
        </h3>
        <dl
          className={
            dialog
              ? "grid grid-cols-1 gap-x-8 gap-y-4 min-[480px]:grid-cols-2"
              : compact
              ? "grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-1"
              : "grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2"
          }
        >
          {group.rows.map(({ key, label, value }) => (
            <div key={key} className="min-w-0">
              <dt
                className={
                  dialog
                    ? "text-[11px] leading-[14px] text-muted-foreground"
                    : compact
                    ? "mb-0.5 text-xs text-muted-foreground"
                    : "text-xs uppercase tracking-wide text-muted-foreground"
                }
              >
                {label}
              </dt>
              <dd
                className={
                  dialog
                    ? cn("mt-1 text-[13px] leading-[18px] wrap-anywhere", value === "" ? "text-muted-foreground" : "text-foreground")
                    : portal
                    ? "text-[17px] text-foreground break-words"
                    : "text-sm text-foreground break-words"
                }
              >
                {formatFormDataValue(key, value, request)}
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
