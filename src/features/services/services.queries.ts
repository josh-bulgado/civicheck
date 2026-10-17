import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import {
  canonicalRouteCode,
  collectRequirements,
  loadServiceCatalogue,
  resolveServices,
} from "~/features/services/services.catalogue";
import { buildLegacyFormDefinition } from "~/features/forms/form-template.utils";

// Every read below is derived from the in-process catalogue cache rather than
// querying Supabase directly — see `services.catalogue.ts` for why that is safe
// for this data. On a warm cache these server functions do no database work at
// all; on a cold one they share a single pair of parallel queries.

export type ServiceSummary = Pick<
  import("~/features/admin/services/services.types").Service,
  | "service_code"
  | "name"
  | "classification"
  | "fee"
  | "processing_time"
  | "display_group"
  | "display_name"
  | "steps_description"
  | "department_id"
> & {
  /** Short card title; null until an admin sets one (or before the column exists). */
  short_name: string | null;
  requirement_count: number;
};

export const getServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServiceSummary[]> => {
    const catalogue = await loadServiceCatalogue();

    // One card per display group; ungrouped services stand alone.
    const seen = new Set<string>();

    return catalogue.services
      .filter((service) => {
        if (!service.display_group) return true;
        if (seen.has(service.display_group)) return false;
        seen.add(service.display_group);
        return true;
      })
      .map((service) => {
        // Count against the same code the card routes on and the same resolution
        // the requirements popup uses, so "N requirements" always matches the
        // checklist the applicant sees when they open it.
        //
        // This corrects a real undercount. Requirement rows use two linkage
        // conventions: group-owned rows carry the group and leave `service_code`
        // null (`birth_delayed`), while service-owned rows carry their own code
        // (`RA9048-CCE`). The previous count only ever matched on `service_code`,
        // so every group-owned service reported "0 requirements" on its card
        // while its popup listed a full checklist.
        const routeCode = service.display_group ?? service.service_code;
        const { services: cases } = resolveServices(catalogue, routeCode);

        return {
          service_code: service.service_code,
          name: service.name,
          classification: service.classification,
          fee: service.fee,
          processing_time: service.processing_time,
          display_group: service.display_group,
          display_name: service.display_name,
          short_name: service.short_name ?? null,
          steps_description: service.steps_description,
          department_id: service.department_id,
          requirement_count: collectRequirements(catalogue, routeCode, cases)
            .length,
        };
      });
  },
);

const USAGE_TTL_MS = 5 * 60 * 1000;
const USAGE_RETRY_MS = 60 * 1000;
let usageCache: { value: Record<string, number>; expiresAt: number } | null = null;

/**
 * How many requests each service card has ever had, keyed by the code a card
 * routes on (`display_group ?? service_code`), for the applicant's "Most used
 * first" sort.
 *
 * It is a count per service and nothing else, so one copy is shared by every
 * applicant. The database function that takes it is not in every environment
 * yet; without it the answer is empty and the sort falls back to A to Z.
 */
export const getServiceUsageFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, number>> => {
    const { supabase, role } = await requireActiveSession();
    // Only the applicant's directory has this sort.
    if (role !== "applicant") return {};
    if (usageCache && usageCache.expiresAt > Date.now()) return usageCache.value;

    try {
      const [{ data, error }, catalogue] = await Promise.all([
        supabase.rpc("service_request_counts"),
        loadServiceCatalogue(),
      ]);
      if (error) throw new Error(error.message);

      const usage: Record<string, number> = {};
      for (const row of (data ?? []) as { service_code: string; request_count: number }[]) {
        const routeCode =
          catalogue.servicesByCode.get(row.service_code)?.display_group ?? row.service_code;
        usage[routeCode] = (usage[routeCode] ?? 0) + Number(row.request_count);
      }
      usageCache = { value: usage, expiresAt: Date.now() + USAGE_TTL_MS };
      return usage;
    } catch {
      // Keep the last good numbers if there are any; look again soon either way.
      const value = usageCache?.value ?? {};
      usageCache = { value, expiresAt: Date.now() + USAGE_RETRY_MS };
      return value;
    }
  },
);

export type ServiceDetail = Awaited<ReturnType<typeof getServiceDetail>>;

export const getServiceDetail = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: slugOrCode }) => {
    const catalogue = await loadServiceCatalogue();
    // The apply URL carries a slug ("marriage-license"); everything past this
    // point — checklist keys, draft storage, uploads — runs on the real code.
    const serviceCodeOrGroup = canonicalRouteCode(catalogue, slugOrCode);
    const { services, isGroup } = resolveServices(catalogue, serviceCodeOrGroup);

    if (services.length === 0) {
      throw new Error(`No service found for "${slugOrCode}".`);
    }

    // Grouped services resolve their checklist off the group key; a standalone
    // service falls back to its own code when it carries no requirement group.
    const requirementKey = isGroup
      ? services[0].display_group!
      : (services[0].requirement_group ?? serviceCodeOrGroup);

    const configuredServices = services.map((service) => ({
      ...service,
      form_template:
        catalogue.formTemplatesByService.get(service.service_code) ?? {
          templateId: null,
          templateKey: `legacy-${service.service_code.toLowerCase()}`,
          templateName: `${service.name} application`,
          versionId: null,
          version: 0,
          definition: buildLegacyFormDefinition(service),
        },
    }));

    return {
      routeCode: serviceCodeOrGroup,
      isGroup,
      displayName: services[0].display_name ?? services[0].name,
      services: configuredServices,
      requirements: catalogue.requirementsByGroup.get(requirementKey) ?? [],
    };
  });

/**
 * Everything the "View requirements" popup needs for one service card: the
 * case(s) sitting behind the card plus their full checklist.
 *
 * Unlike `getServiceDetail`, this resolves requirements against every key the
 * card touches — the group key, each case's `service_code`, and each case's
 * `requirement_group` — because some grouped services keep one shared checklist
 * on the group key while others keep a separate checklist per case.
 */
export const getServiceOverview = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: codeOrGroup }) => {
    const catalogue = await loadServiceCatalogue();
    const { services, isGroup } = resolveServices(catalogue, codeOrGroup);

    if (services.length === 0) {
      throw new Error(`No service found for "${codeOrGroup}".`);
    }

    return {
      isGroup,
      displayName: services[0].display_name ?? services[0].name,
      services,
      requirements: collectRequirements(catalogue, codeOrGroup, services),
    };
  });

export const getAllServicesWithRequirements = createServerFn({
  method: "GET",
}).handler(async () => {
  const { services, requirements } = await loadServiceCatalogue();
  return { services, requirements };
});
