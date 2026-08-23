import { createServerFn } from "@tanstack/react-start";
import { isDepartmentScopedRole } from "~/lib/permissions";
import { requireActiveSession } from "~/server/auth";

export interface EncodableService {
  serviceCode: string;
  name: string;
  fee: number;
  displayGroup: string | null;
  processingTime: string;
  /** Who this service asks about, e.g. ["Subject"] or ["Bride", "Groom"]. */
  partyRoles: string[];
}

export const getEncodableServicesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<EncodableService[]> => {
    const { supabase, role, departmentId } = await requireActiveSession(
      "requests:encode_walkin",
    );

    let query = supabase
      .from("services_registry")
      .select(
        "service_code, name, display_name, fee, department_id, display_group, processing_time, party_roles",
      )
      .order("name", { ascending: true });

    if (isDepartmentScopedRole(role)) {
      if (!departmentId) return [];
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((service) => ({
      serviceCode: service.service_code,
      name: service.display_name || service.name,
      fee: Number(service.fee ?? 0),
      displayGroup: service.display_group,
      processingTime: service.processing_time,
      partyRoles: service.party_roles?.length ? service.party_roles : ["Subject"],
    }));
  },
);
