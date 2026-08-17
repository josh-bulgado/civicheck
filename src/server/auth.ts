import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountStatus, Permission, Role } from "~/lib/permissions";
import { hasPermission, isDepartmentScopedRole } from "~/lib/permissions";
import { getSupabaseServerClient } from "~/utils/supabase";

export type ActiveSession = {
  supabase: SupabaseClient;
  user: VerifiedSessionUser;
  role: Role;
  accountStatus: AccountStatus;
  /** Null for roles that aren't department-scoped (see isDepartmentScopedRole). */
  departmentId: string | null;
  departmentName: string | null;
};

export type VerifiedSessionUser = {
  id: string;
  email?: string;
  user_metadata: {
    avatar_url?: string;
  };
};

/**
 * Verifies the signed access token locally when the project uses asymmetric
 * signing keys. Supabase falls back to the Auth server automatically for
 * legacy symmetric keys, so this remains a secure replacement for getUser().
 */
export async function getVerifiedSessionUser(
  supabase: SupabaseClient,
): Promise<VerifiedSessionUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (error || !claims || typeof claims.sub !== "string") return null;

  const metadata = claims.user_metadata;
  const avatarUrl =
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : undefined;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    user_metadata: avatarUrl ? { avatar_url: avatarUrl } : {},
  };
}

/** Server-side security boundary for every identity-dependent operation. */
export async function requireActiveSession(
  permission?: Permission,
): Promise<ActiveSession> {
  const supabase = getSupabaseServerClient();
  const user = await getVerifiedSessionUser(supabase);

  if (!user) throw new Error("Unauthorized: not authenticated");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, access_status, department_id, departments(name)")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) throw new Error("Unauthorized: profile missing");

  const role = profile.role as Role;
  const accountStatus = (profile.access_status ?? "active") as AccountStatus;
  if (accountStatus !== "active") throw new Error("Account is not active");
  if (permission && !hasPermission(role, permission)) {
    throw new Error(`Forbidden: requires "${permission}" permission`);
  }

  // Defensive: a department-scoped role with no department assigned is
  // scoped to nothing, never treated as unscoped. Callers that filter by
  // `departmentId` should always exclude rows when this is null.
  const department = Array.isArray(profile.departments)
    ? profile.departments[0]
    : profile.departments;
  const departmentId = isDepartmentScopedRole(role)
    ? ((profile.department_id as string | null) ?? null)
    : null;
  const departmentName = departmentId ? ((department?.name as string) ?? null) : null;

  return { supabase, user, role, accountStatus, departmentId, departmentName };
}

export function isOperationalRole(role: Role): boolean {
  return ["frontdesk", "staff", "supervisor", "cashier"].includes(role);
}
