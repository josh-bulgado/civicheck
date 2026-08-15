import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AccountStatus, Permission, Role } from "~/lib/permissions";
import { hasPermission } from "~/lib/permissions";
import { getSupabaseServerClient } from "~/utils/supabase";

export type ActiveSession = {
  supabase: SupabaseClient;
  user: User;
  role: Role;
  accountStatus: AccountStatus;
};

/** Server-side security boundary for every identity-dependent operation. */
export async function requireActiveSession(
  permission?: Permission,
): Promise<ActiveSession> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Unauthorized: not authenticated");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, access_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) throw new Error("Unauthorized: profile missing");

  const role = profile.role as Role;
  const accountStatus = (profile.access_status ?? "active") as AccountStatus;
  if (accountStatus !== "active") throw new Error("Account is not active");
  if (permission && !hasPermission(role, permission)) {
    throw new Error(`Forbidden: requires "${permission}" permission`);
  }

  return { supabase, user, role, accountStatus };
}

export function isOperationalRole(role: Role): boolean {
  return ["frontdesk", "staff", "supervisor", "cashier"].includes(role);
}
