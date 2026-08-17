import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import type { Department } from "./staff/staff.types";

export type { Department } from "./staff/staff.types";

/**
 * The CCRO departments a service can be routed to. Shared by the admin service
 * form (which assigns one) and the request queue (which filters by one).
 */
export const getActiveDepartments = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) throw new Error(error.message);
    return (data ?? []) as Department[];
  },
);
