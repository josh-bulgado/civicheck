import { createServerFn } from "@tanstack/react-start";
import { parseRequirementName } from "~/features/services/service-utils";
import { getSupabaseServerClient } from "~/utils/supabase";

/**
 * The checklists the landing hero rotates through — one per record type, so
 * whichever document brought a first-time visitor here, they see the shape of
 * its checklist without touching a control. Everything on the card is read from
 * the database so the hero cannot drift when an admin edits a checklist.
 *
 * Matched case-insensitively on purpose: `requirement_group` was seeded
 * inconsistently (`birth_ontime` but `MARRIAGE_LICENSE`), so an exact-match
 * filter would silently drop half the rotation.
 */
const FEATURED_GROUPS = [
  "birth_ontime",
  "marriage_license",
  "death_delayed",
  "ctc_issuance",
] as const;

const PREVIEW_LIMIT = 3;

/** PostgREST `or` filter matching any featured group regardless of casing. */
const featuredGroupFilter = FEATURED_GROUPS.map(
  (group) => `requirement_group.ilike.${group}`,
).join(",");

export type FeaturedChecklistItem = {
  name: string;
  source: string | null;
};

export type FeaturedChecklist = {
  group: string;
  displayName: string;
  linkCode: string;
  totalCount: number;
  remainingCount: number;
  items: FeaturedChecklistItem[];
};

export const getFeaturedChecklists = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedChecklist[]> => {
    try {
      const supabase = getSupabaseServerClient();

      // Neither table has a sort column, so order explicitly — an unordered
      // select can come back in a different order per query and desync the
      // server-rendered card from the client.
      const [{ data: services, error: serviceError }, { data: rows, error: reqError }] =
        await Promise.all([
          supabase
            .from("services_registry")
            .select("service_code, name, display_name, requirement_group")
            .or(featuredGroupFilter)
            .order("service_code", { ascending: true }),
          supabase
            .from("service_requirements_metadata")
            .select("requirement_group, requirement_name, where_to_secure, case_tag")
            .or(featuredGroupFilter)
            .order("requirement_name", { ascending: true }),
        ]);

      if (serviceError || reqError || !services?.length || !rows?.length) return [];

      // Built in FEATURED_GROUPS order rather than query order: the rotation
      // should read birth → marriage → death → CTC, not alphabetically.
      return FEATURED_GROUPS.map((group): FeaturedChecklist | null => {
        const service = services.find(
          (entry) => entry.requirement_group?.toLowerCase() === group,
        );
        const groupRows = rows.filter(
          (row) => row.requirement_group?.toLowerCase() === group,
        );

        if (!service || !groupRows.length) return null;

        // Case-tagged rows only apply to some applicants (marital vs
        // non-marital, etc.), so lead with the ones every applicant has to
        // bring.
        const universal = groupRows.filter((row) => !row.case_tag);
        const preview = (universal.length ? universal : groupRows).slice(
          0,
          PREVIEW_LIMIT,
        );

        return {
          group,
          displayName: service.display_name ?? service.name,
          linkCode: service.service_code,
          totalCount: groupRows.length,
          remainingCount: groupRows.length - preview.length,
          items: preview.map((row) => ({
            name: parseRequirementName(row.requirement_name).primary,
            source: row.where_to_secure,
          })),
        };
      }).filter((checklist): checklist is FeaturedChecklist => checklist !== null);
    } catch {
      // The landing page is public and must render even if Supabase is down.
      return [];
    }
  },
);
