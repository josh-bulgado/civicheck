import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

export const getUserFn = createServerFn({ method: "GET" }).handler(async () => {
  try { return (await requireActiveSession()).user; } catch { return null; }
});

export const fetchUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    let session;
    try { session = await requireActiveSession(); } catch { return null; }
    const { supabase, user } = session;

    // Fetch profile data
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, middle_name, last_name")
      .eq("id", user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      profile: {
        ...profile,
        avatar_url: user.user_metadata.avatar_url,
      },
    };
  },
);
