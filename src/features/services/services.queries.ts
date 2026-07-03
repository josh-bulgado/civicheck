import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export type ServiceSummary = Pick<
  import("~/features/admin/services/services.types").Service,
  "service_code" | "name" | "classification" | "fee" | "processing_time" | "display_group" | "display_name"
>;

export const getServices = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("services_registry")
      .select(
        "service_code, name, classification, fee, processing_time, display_group, display_name",
      )
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    const rows = data || [];
    const seen = new Set<string>();

    return rows.filter((row) => {
      if (!row.display_group) return true;
      if (seen.has(row.display_group)) return false;
      seen.add(row.display_group);
      return true;
    });
  },
);

export const getServiceDetail = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: serviceCodeOrGroup }) => {
    const supabase = getSupabaseServerClient();

    // Try as display_group first
    const { data: grouped } = await supabase
      .from("services_registry")
      .select("*")
      .eq("display_group", serviceCodeOrGroup)
      .order("service_code", { ascending: true });

    if (grouped && grouped.length > 0) {
      const requirementGroup = grouped[0].display_group!;
      const { data: requirements, error: reqError } = await supabase
        .from("service_requirements_metadata")
        .select("*")
        .eq("requirement_group", requirementGroup);

      if (reqError) throw new Error(reqError.message);

      return {
        isGroup: true,
        displayName: grouped[0].display_name,
        services: grouped,
        requirements: requirements || [],
      };
    }

    // Fallback: treat as standalone service_code
    const { data: service, error: serviceError } = await supabase
      .from("services_registry")
      .select("*")
      .eq("service_code", serviceCodeOrGroup)
      .single();

    if (serviceError) throw new Error(serviceError.message);

    const { data: requirements, error: reqError } = await supabase
      .from("service_requirements_metadata")
      .select("*")
      .eq("requirement_group", service.requirement_group ?? serviceCodeOrGroup);

    if (reqError) throw new Error(reqError.message);

    return {
      isGroup: false,
      displayName: service.display_name ?? service.name,
      services: [service],
      requirements: requirements || [],
    };
  });

export const getAllServicesWithRequirements = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data: services, error: sErr } = await supabase
      .from("services_registry")
      .select("*")
      .order("name", { ascending: true });

    if (sErr) throw new Error(sErr.message);

    const { data: reqs, error: rErr } = await supabase
      .from("service_requirements_metadata")
      .select("*");

    if (rErr) throw new Error(rErr.message);

    return {
      services: services || [],
      requirements: reqs || [],
    };
  }
);


