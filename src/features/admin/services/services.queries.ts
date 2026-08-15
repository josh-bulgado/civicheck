import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import type { Service, ServiceRequirement } from "./services.types";
import { requireActiveSession } from "~/server/auth";

export type { ServiceRequirement } from "./services.types";

export const getAdminServices = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireActiveSession("services:manage");
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("services_registry")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as Service[];
  }
);

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
    return (data || []) as ServiceRequirement[];
  });
