import type { User } from "@supabase/supabase-js";
import type { getSupabaseAdminClient } from "~/utils/supabase";

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

const PAGE_SIZE = 1000;

/**
 * Every auth user, read page by page. `listUsers` returns at most one page, so
 * reading only the first would silently miss everyone past the first thousand.
 */
export async function listAllAuthUsers(admin: AdminClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) return users;
  }
}

/** The auth user with this email (case-insensitive), or null. Stops at the first match. */
export async function findAuthUserByEmail(
  admin: AdminClient,
  email: string,
): Promise<User | null> {
  const wanted = email.trim().toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === wanted);
    if (match) return match;
    if (data.users.length < PAGE_SIZE) return null;
  }
}
