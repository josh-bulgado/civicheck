import { createServerFn } from "@tanstack/react-start";
import { parseRequirementName } from "~/features/services/service-utils";
import { getSupabaseServerClient } from "~/utils/supabase";

/**
 * The checklist sampled in the landing hero. Birth registration is the CCRO's
 * highest-volume service, so it is the most useful one to show a first-time
 * visitor. Everything else on the card is read from the database so the hero
 * cannot drift when an admin edits the checklist.
 */
const FEATURED_GROUP = "birth_ontime";
const PREVIEW_LIMIT = 3;

export type FeaturedChecklistItem = {
  name: string;
  source: string | null;
};

export type FeaturedChecklist = {
  displayName: string;
  linkCode: string;
  totalCount: number;
  remainingCount: number;
  items: FeaturedChecklistItem[];
};

export const getFeaturedChecklist = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedChecklist | null> => {
    try {
      const supabase = getSupabaseServerClient();

      const { data: services, error: serviceError } = await supabase
        .from("services_registry")
        .select("service_code, name, display_name")
        .eq("requirement_group", FEATURED_GROUP)
        .order("service_code", { ascending: true });

      if (serviceError || !services?.length) return null;

      // The table has no sort column, so order explicitly — an unordered
      // select can come back in a different order per query and desync the
      // server-rendered card from the client.
      const { data: rows, error: reqError } = await supabase
        .from("service_requirements_metadata")
        .select("requirement_name, where_to_secure, case_tag")
        .eq("requirement_group", FEATURED_GROUP)
        .order("requirement_name", { ascending: true });

      if (reqError || !rows?.length) return null;

      // Case-tagged rows only apply to some applicants (marital vs non-marital,
      // etc.), so lead with the ones every applicant has to bring.
      const universal = rows.filter((row) => !row.case_tag);
      const preview = (universal.length ? universal : rows).slice(
        0,
        PREVIEW_LIMIT,
      );

      return {
        displayName: services[0].display_name ?? services[0].name,
        linkCode: services[0].service_code,
        totalCount: rows.length,
        remainingCount: rows.length - preview.length,
        items: preview.map((row) => ({
          name: parseRequirementName(row.requirement_name).primary,
          source: row.where_to_secure,
        })),
      };
    } catch {
      // The landing page is public and must render even if Supabase is down.
      return null;
    }
  },
);
