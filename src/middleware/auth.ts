import { createMiddleware } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import { getVerifiedSessionUser } from "~/server/auth";
import { hasPermission } from "~/lib/permissions";
import type { AccountStatus, Permission, Role } from "~/lib/permissions";

/**
 * Initializes the Supabase client and fetches the authenticated user once.
 * Passes both down via context so handlers don't need to re-fetch.
 */
export const rbacMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const supabase = getSupabaseServerClient();

    const user = await getVerifiedSessionUser(supabase);

    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, access_status")
      .eq("id", user.id)
      .single();

    const status = (profile?.access_status ?? "active") as AccountStatus;
    if (status !== "active") {
      throw new Error("Forbidden: account is not active");
    }

    return next({
      context: {
        supabase,
        user,
        role: (profile?.role ?? "applicant") as Role,
        accountStatus: status,
      },
    });
  },
);

/**
 * Checks that the authenticated user has the required permission.
 * Must be used after rbacMiddleware (depends on context.role).
 */
export const requirePermission = (permission: Permission) =>
  createMiddleware({ type: "function" })
    .middleware([rbacMiddleware])
    .server(async ({ next, context }) => {
      if (!hasPermission(context.role, permission)) {
        throw new Error(`Forbidden: requires "${permission}" permission`);
      }
      return next();
    });
