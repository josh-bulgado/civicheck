import { useMemo, useState } from "react";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import { TableSearch } from "~/components/ui/data-table-toolbar";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "~/components/ui/item";
import { ServiceReferenceDetail } from "~/features/services/components/ServiceReferenceDetail";
import { prefetchServiceOverview } from "~/features/services/hooks/useServiceOverview";
import type { ServiceSummary } from "~/features/services/services.queries";
import {
  feeRangeLabel,
  groupServicesByCategory,
} from "~/features/services/service-reference";
import type { getMyDepartmentScopeFn } from "~/features/requests/requests.queries";

/** Above this many services the rail gets a search; below it the list is the search. */
const SEARCH_FROM = 5;

const routeCodeOf = (service: ServiceSummary) =>
  service.display_group ?? service.service_code;
const titleOf = (service: ServiceSummary) =>
  service.display_name ?? service.name;

interface ServiceReferenceDeskProps {
  /** Already limited to the staff member's department, when they have one. */
  services: ServiceSummary[];
  scope: Awaited<ReturnType<typeof getMyDepartmentScopeFn>>;
  /** `display_group ?? service_code` from the URL: the palette's deep link, or the last pick. */
  selectedService?: string;
  /** Writes a pick to the URL, so the page can be shared, refreshed and stepped back through. */
  onSelectService: (code: string) => void;
}

/**
 * The staff service reference: the services on the left, the selected one's
 * answer on the right. Built for a visitor standing at the counter, so the
 * checklist is on the page and a click changes it in place.
 */
export function ServiceReferenceDesk({
  services,
  scope,
  selectedService,
  onSelectService,
}: ServiceReferenceDeskProps) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...services]
      .filter((service) => !term || titleOf(service).toLowerCase().includes(term))
      .sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
  }, [services, search]);
  const groups = useMemo(
    () => groupServicesByCategory(visible, scope.isScoped),
    [visible, scope.isScoped],
  );

  const selected =
    visible.find((service) => routeCodeOf(service) === selectedService) ??
    visible[0];

  const where = scope.isScoped && scope.departmentName
    ? `${scope.departmentName} department`
    : "All departments";

  return (
    <>
      <PageHeaderCard
        title="Service Reference"
        description={`${where}, ${services.length} ${services.length === 1 ? "service" : "services"}. What a visitor needs to bring, and what they will pay.`}
      />

      {services.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-6 py-12 text-center text-sm text-muted-foreground">
          No services are set up for this department yet.
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <nav
            aria-label="Services"
            className="flex flex-col gap-3 lg:sticky lg:top-6"
          >
            {services.length > SEARCH_FROM ? (
              <TableSearch
                value={search}
                onChange={setSearch}
                placeholder="Find a service"
                label="Search services"
              />
            ) : null}

            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-1.5">
                {group.label ? (
                  <h2 className="px-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    {group.label}
                  </h2>
                ) : null}
                {group.services.map((service) => {
                  const code = routeCodeOf(service);
                  return (
                    <Item
                      key={code}
                      render={<button type="button" />}
                      variant="selectable"
                      size="sm"
                      className="flex-nowrap items-start rounded-xl"
                      aria-current={
                        selected && routeCodeOf(selected) === code
                          ? "true"
                          : undefined
                      }
                      onClick={() => onSelectService(code)}
                      onPointerEnter={() => prefetchServiceOverview(code)}
                      onFocus={() => prefetchServiceOverview(code)}
                    >
                      <ItemContent className="min-w-0 gap-0.5">
                        <ItemTitle className="line-clamp-2 w-auto font-semibold text-balance">
                          {titleOf(service)}
                        </ItemTitle>
                        <ItemDescription className="text-xs tabular-nums">
                          {service.requirement_count}{" "}
                          {service.requirement_count === 1
                            ? "requirement"
                            : "requirements"}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions className="shrink-0 text-xs font-semibold text-body tabular-nums">
                        {feeRangeLabel(service.fee_min, service.fee_max)}
                      </ItemActions>
                    </Item>
                  );
                })}
              </div>
            ))}

            {visible.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">
                No service matches &ldquo;{search.trim()}&rdquo;.
              </p>
            ) : null}
          </nav>

          {selected ? (
            <ServiceReferenceDetail
              key={routeCodeOf(selected)}
              service={selected}
            />
          ) : null}
        </div>
      )}
    </>
  );
}
