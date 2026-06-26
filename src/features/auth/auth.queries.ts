import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

export const getUserFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const fetchUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getSupabaseServerClient();
    const { data, error: _error } = await supabase.auth.getUser();

    if (!data.user?.email) {
      return null;
    }

    // Fetch profile data
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("first_name, middle_name, last_name")
      .eq("id", data.user.id)
      .single();

    return {
      id: data.user.id,
      email: data.user.email,
      profile: {
        ...profile,
        avatar_url: data.user.user_metadata.avatar_url,
      },
    };
  },
);
