import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

/** Records that the welcome tutorial has opened, so it never opens on its own again. */
export const markWelcomeTutorialSeenFn = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, user } = await requireActiveSession();

  const { error } = await supabase
    .from("profiles")
    .update({ welcome_tutorial_seen: true })
    .eq("id", user.id);

  return { error: Boolean(error) };
});
