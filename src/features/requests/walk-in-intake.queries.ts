import { createServerFn } from "@tanstack/react-start";
import { isDepartmentScopedRole } from "~/lib/permissions";
import { requireActiveSession } from "~/server/auth";
import { loadServiceCatalogue } from "~/features/services/services.catalogue";
import type { PublishedFormTemplate } from "~/features/forms/form-template.types";
import { isWalkInBirth } from "./walk-in-birth";

export interface EncodableService {
  serviceCode: string;
  name: string;
  fee: number;
  /** True when `fee` is charged per copy, so intake asks how many copies. */
  feePerCopy: boolean;
  displayGroup: string | null;
  processingTime: string;
  /** Who this service asks about, e.g. ["Subject"] or ["Bride", "Groom"]. */
  partyRoles: string[];
  birthForm?: PublishedFormTemplate;
}

export const getEncodableServicesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<EncodableService[]> => {
    const { supabase, role, departmentId } = await requireActiveSession(
      "requests:encode_walkin",
    );

    let query = supabase
      .from("services_registry")
      .select(
        "service_code, name, display_name, fee, fee_per_copy, department_id, display_group, processing_time, party_roles",
      )
      .order("name", { ascending: true });

    if (isDepartmentScopedRole(role)) {
      if (!departmentId) return [];
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const catalogue = (data ?? []).some((service) => isWalkInBirth(service.service_code))
      ? await loadServiceCatalogue()
      : null;

    return (data ?? []).map((service) => ({
      serviceCode: service.service_code,
      name: service.name,
      fee: Number(service.fee ?? 0),
      feePerCopy: service.fee_per_copy === true,
      displayGroup: service.display_group,
      processingTime: service.processing_time,
      partyRoles: service.party_roles?.length ? service.party_roles : ["Subject"],
      birthForm: isWalkInBirth(service.service_code) ? catalogue?.formTemplatesByService.get(service.service_code) : undefined,
    }));
  },
);
