import { createServerFn } from "@tanstack/react-start";
import {
  collectRequirements,
  loadServiceCatalogue,
  resolveServices,
} from "~/features/services/services.catalogue";

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
> & { requirement_count: number };

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
          steps_description: service.steps_description,
          department_id: service.department_id,
          requirement_count: collectRequirements(catalogue, routeCode, cases)
            .length,
        };
      });
  },
);

export const getServiceDetail = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: serviceCodeOrGroup }) => {
    const catalogue = await loadServiceCatalogue();
    const { services, isGroup } = resolveServices(catalogue, serviceCodeOrGroup);

    if (services.length === 0) {
      throw new Error(`No service found for "${serviceCodeOrGroup}".`);
    }

    // Grouped services resolve their checklist off the group key; a standalone
    // service falls back to its own code when it carries no requirement group.
    const requirementKey = isGroup
      ? services[0].display_group!
      : (services[0].requirement_group ?? serviceCodeOrGroup);

    return {
      isGroup,
      displayName: services[0].display_name ?? services[0].name,
      services,
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
