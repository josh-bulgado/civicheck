"use client";

import { Fragment, useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { QuietLink } from "~/components/quiet-link";
import { cn } from "~/lib/utils";
import type { Role } from "~/lib/permissions";
import { buildCrumbs } from "./build-crumbs";

/**
 * Where you are in the internal workspace: workspace, then section, then page.
 * The trails live in `build-crumbs.ts`; a page without one shows nothing. On a
 * phone there is room for the last two crumbs at most, never the workspace name.
 */
export function DashboardBreadcrumbs({ role }: { role: Role }) {
  const matches = useRouterState({ select: (state) => state.matches });
  const crumbs = useMemo(() => buildCrumbs(role, matches), [role, matches]);

  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="min-w-0 flex-nowrap gap-2 sm:gap-2">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isRoot = index === 0;
          // The workspace name goes first on a phone, as soon as there is a page
          // after it; then whatever still does not fit in the last two.
          const hiddenOnPhone =
            (isRoot && crumbs.length > 1) || index < crumbs.length - 2;

          return (
            <Fragment key={`${index}-${crumb.label}`}>
              <BreadcrumbItem
                className={cn(
                  // Only the page you are on gives way when the row is short.
                  isLast ? "min-w-0 overflow-hidden" : "shrink-0",
                  hiddenOnPhone && "hidden sm:inline-flex",
                )}
              >
                {isLast ? (
                  <BreadcrumbPage className="block truncate font-medium">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink
                    render={<QuietLink to={crumb.to} />}
                    className={cn(
                      "whitespace-nowrap",
                      isRoot && "font-semibold text-primary hover:text-primary-hover",
                    )}
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <span className="whitespace-nowrap">{crumb.label}</span>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className={cn("shrink-0", hiddenOnPhone && "hidden sm:block")} />
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
