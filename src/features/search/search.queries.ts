import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireActiveSession } from "~/server/auth";
import { one } from "~/lib/embed";
import { hasPermission, isDepartmentScopedRole } from "~/lib/permissions";
import { loadServiceCatalogue } from "~/features/services/services.catalogue";
import { TERMINAL_STATUSES } from "~/features/requests/request-workflow";
import type { Service } from "~/features/admin/services/services.types";

const searchInput = z.object({
  // Two characters is the shortest term that meaningfully narrows the
  // catalogue; below that the palette keeps showing navigation only.
  query: z.string().trim().min(2).max(80),
});

export interface ServiceSearchHit {
  /** Representative `services_registry.service_code`. */
  serviceCode: string;
  /** `display_group ?? service_code` — what the services page and apply flow key on. */
  routeCode: string;
  title: string;
  classification: string | null;
  fee: number;
  displayGroup: string | null;
  processingTime: string;
  /**
   * Every field the server matched on. The palette feeds this to cmdk as the
   * item value so its client-side filter agrees with the server's — otherwise a
   * hit matched on steps or requirement group would be filtered back out.
   */
  keywords: string;
}

export interface RequestSearchHit {
  id: string;
  trackingNumber: string;
  status: string;
  serviceName: string;
  applicantName: string;
  /** When the request was submitted (ISO). */
  createdAt: string;
  /** Matched fields, passed to cmdk so its filter mirrors the server's. */
  keywords: string;
}

export interface SearchResults {
  services: ServiceSearchHit[];
  requests: RequestSearchHit[];
}

const SERVICE_RESULT_LIMIT = 6;
const REQUEST_RESULT_LIMIT = 6;

type Embed<T> = T | T[] | null | undefined;

interface ServiceNameEmbed {
  name?: string | null;
  display_name?: string | null;
}

/** A `requests` row as `searchEverythingFn` selects it. */
interface RequestSearchRow {
  id: string;
  tracking_number: string;
  request_type: string | null;
  status: string;
  created_at: string;
  form_data: Record<string, unknown> | null;
  services_registry: Embed<
    ServiceNameEmbed & {
      department_id?: string | null;
      departments?: Embed<{ id: string; name: string }>;
    }
  >;
  profiles: Embed<{ first_name?: string | null; last_name?: string | null }>;
}

/** A `requests` row as `getPaletteDefaultsFn` selects it. */
interface PaletteDefaultRow {
  id: string;
  tracking_number: string;
  request_type: string | null;
  status: string;
  created_at: string;
  services_registry: Embed<ServiceNameEmbed>;
}

/** Everything a service search can match on, as one lowercased string. */
function serviceHaystack(service: Service): string {
  return [
    service.name,
    service.display_name,
    service.service_code,
    service.classification,
    service.requirement_group,
    ...(service.steps_description ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Services are small enough to filter in memory off the shared catalogue. */
function matchesService(service: Service, term: string): boolean {
  return serviceHaystack(service).includes(term);
}

/** How many requests the palette lists before a word is typed. */
const DEFAULT_REQUEST_LIMIT = 3;
/** How far back to look for them: enough to find a ready one among newer ones. */
const DEFAULT_REQUEST_LOOKBACK = 20;

/**
 * PostgREST reads these characters as `or` syntax, so a search term containing
 * them would otherwise be parsed as a malformed filter rather than text.
 */
function sanitizeForOr(term: string): string {
  return term.replace(/[%,()*\\]/g, " ").trim();
}

/**
 * One query, three corpora: the static navigation list is filtered client-side
 * by the palette, while services and requests are matched here. Requests are
 * scoped server-side — applicants only ever match their own rows, and
 * department-scoped staff only their department's — so the palette can't widen
 * what the caller is allowed to see.
 */
export const searchEverythingFn = createServerFn({ method: "GET" })
  .validator(searchInput)
  .handler(async ({ data }): Promise<SearchResults> => {
    const { supabase, user, role, departmentId } = await requireActiveSession();
    const term = data.query.toLowerCase();

    const catalogue = await loadServiceCatalogue();

    // Department-scoped staff only see their own department's services in the
    // directory, so a hit outside it would route to an empty view.
    const searchableServices = isDepartmentScopedRole(role)
      ? catalogue.services.filter(
          (service) => departmentId != null && service.department_id === departmentId,
        )
      : catalogue.services;

    // One hit per display group: the group's first case stands in for it, and
    // its `routeCode` is what the services page and apply flow key on.
    const seenGroups = new Set<string>();
    const services = searchableServices
      .filter((service) => matchesService(service, term))
      .filter((service) => {
        if (!service.display_group) return true;
        if (seenGroups.has(service.display_group)) return false;
        seenGroups.add(service.display_group);
        return true;
      })
      .slice(0, SERVICE_RESULT_LIMIT)
      .map(
        (service): ServiceSearchHit => ({
          serviceCode: service.service_code,
          routeCode: service.display_group ?? service.service_code,
          title: service.display_name ?? service.name,
          classification: service.classification,
          fee: service.fee,
          displayGroup: service.display_group,
          processingTime: service.processing_time,
          keywords: serviceHaystack(service),
        }),
      );

    const canViewAll = hasPermission(role, "requests:view_all");
    const canViewOwn = hasPermission(role, "requests:view_own");
    if (!canViewAll && !canViewOwn) return { services, requests: [] };

    const pattern = `*${sanitizeForOr(term)}*`;
    let query = supabase
      .from("requests")
      .select(
        `id, tracking_number, request_type, status, created_at, form_data,
         services_registry(name, display_name, department_id, departments(id, name)),
         profiles(first_name, last_name)`,
      )
      .or(
        [
          `tracking_number.ilike.${pattern}`,
          `request_type.ilike.${pattern}`,
          `form_data->>subject_first_name.ilike.${pattern}`,
          `form_data->>subject_last_name.ilike.${pattern}`,
        ].join(","),
      )
      .order("created_at", { ascending: false })
      // Scoped roles are filtered by department below, after the fetch, so give
      // them a deeper page to filter from than the final result count.
      .limit(canViewAll ? 40 : REQUEST_RESULT_LIMIT);

    if (canViewOwn && !canViewAll) query = query.eq("applicant_id", user.id);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const requests = ((rows ?? []) as RequestSearchRow[])
      .map((row) => {
        const service = one(row.services_registry);
        const department = one(service?.departments);
        const profile = one(row.profiles);
        const fromProfile = profile
          ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
          : "";
        const form = row.form_data ?? {};
        const fromForm =
          `${form.subject_first_name ?? ""} ${form.subject_last_name ?? ""}`.trim();

        const applicantName = fromProfile || fromForm || "—";
        const serviceName =
          (service?.display_name || service?.name || row.request_type) ?? "—";

        return {
          id: row.id as string,
          trackingNumber: row.tracking_number as string,
          status: row.status as string,
          serviceName,
          applicantName,
          createdAt: row.created_at as string,
          keywords: [
            row.tracking_number,
            row.request_type,
            fromForm,
            applicantName,
            serviceName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase(),
          departmentId: (department?.id ?? service?.department_id ?? null) as
            | string
            | null,
        };
      })
      .filter(
        (row) =>
          !isDepartmentScopedRole(role) ||
          (departmentId != null && row.departmentId === departmentId),
      )
      .slice(0, REQUEST_RESULT_LIMIT)
      .map(({ departmentId: _departmentId, ...hit }): RequestSearchHit => hit);

    return { services, requests };
  });

/**
 * What the applicant's palette shows before a word is typed: the requests still
 * moving, the one waiting at the cashier first, then newest first. Finished ones
 * are for the full list. Anyone who isn't an applicant gets nothing —
 * personnel keep the plain palette.
 */
export const getPaletteDefaultsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<RequestSearchHit[]> => {
    const { supabase, user, role } = await requireActiveSession();
    const isApplicant =
      hasPermission(role, "requests:view_own") &&
      !hasPermission(role, "requests:view_all");
    if (!isApplicant) return [];

    const { data: rows, error } = await supabase
      .from("requests")
      .select(
        "id, tracking_number, request_type, status, created_at, services_registry(name, display_name)",
      )
      .eq("applicant_id", user.id)
      .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)
      .order("created_at", { ascending: false })
      .limit(DEFAULT_REQUEST_LOOKBACK);
    if (error) throw new Error(error.message);

    // Stable: within "ready" and within "the rest", newest stays first.
    const ordered = [...((rows ?? []) as PaletteDefaultRow[])].sort(
      (a, b) =>
        Number(b.status === "ready_for_release") - Number(a.status === "ready_for_release"),
    );

    return ordered.slice(0, DEFAULT_REQUEST_LIMIT).map((row): RequestSearchHit => {
      const service = one(row.services_registry);
      const serviceName =
        service?.display_name || service?.name || row.request_type || "—";
      return {
        id: row.id,
        trackingNumber: row.tracking_number,
        status: row.status,
        serviceName,
        applicantName: "",
        createdAt: row.created_at,
        keywords: `${row.tracking_number} ${serviceName}`.toLowerCase(),
      };
    });
  },
);
