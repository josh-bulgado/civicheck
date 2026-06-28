import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const getServices = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("services_registry")
      .select(
        "service_code, name, classification, fee, processing_time, display_group, display_name",
      )
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const rows = data || [];
    const seen = new Set<string>();

    return rows.filter((row) => {
      if (!row.display_group) return true; // standalone, always show
      if (seen.has(row.display_group)) return false; // already have a card for this group
      seen.add(row.display_group);
      return true;
    });
  },
);
