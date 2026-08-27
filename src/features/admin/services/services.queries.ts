import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import type { Service, ServiceRequirement } from "./services.types";
import { requireActiveSession } from "~/server/auth";
import { parseConditionRule } from "~/features/forms/form-template.utils";

export type { ServiceRequirement } from "./services.types";

export const getAdminServices = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireActiveSession("services:manage");
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("services_registry")
      .select("*, departments(id, name)")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map((row: any) => {
      const { departments, ...service } = row;
      const department = Array.isArray(departments) ? departments[0] : departments;
      return { ...service, department_name: department?.name ?? null } as Service;
    });
  }
);

/**
 * Resolve the checklist that belongs to one service.
 *
 * A requirement row is linked either by `requirement_group` (variants of one
 * service share a group — e.g. all six DCOLB services share `birth_delayed`)
 * or by its own `service_code`. Matching a single string against both columns
 * misses whichever convention a service doesn't use, so both keys are passed
 * explicitly. `updateServiceWithRequirements` deletes with this same predicate,
 * so what the form loads is exactly what a save replaces.
 */
export const getServiceChecklist = createServerFn({ method: "GET" })
  .validator((d: { service_code: string; requirement_group: string | null }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const groupKey = data.requirement_group ?? data.service_code;

    const { data: rows, error } = await supabase
      .from("service_requirements_metadata")
      .select("*")
      .or(
        `requirement_group.eq.${groupKey},service_code.eq.${data.service_code}`
      )
      .order("is_mandatory", { ascending: false });

    if (error) throw new Error(error.message);
    return (rows ?? []).map((requirement) => ({
      ...requirement,
      applies_when: parseConditionRule(requirement.applies_when),
    })) as ServiceRequirement[];
  });

export const getServiceRequirements = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: requirementGroupOrServiceCode }) => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("service_requirements_metadata")
      .select("*")
      .or(
        `requirement_group.eq.${requirementGroupOrServiceCode},service_code.eq.${requirementGroupOrServiceCode}`
      )
      .order("is_mandatory", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map((requirement) => ({
      ...requirement,
      applies_when: parseConditionRule(requirement.applies_when),
    })) as ServiceRequirement[];
  });
