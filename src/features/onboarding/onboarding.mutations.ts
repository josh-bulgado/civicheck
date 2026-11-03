import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";

/**
 * Saves the name onboarding asks for and nothing else. The settings form's save
 * writes every profile field, so sending it blanks for the ones onboarding
 * doesn't ask would erase a date of birth, phone number or middle name.
 */
export const completeOnboardingFn = createServerFn({ method: "POST" })
  .validator((d: { firstName: string; lastName: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession();

    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    if (!firstName || !lastName) {
      return { error: true, message: "First name and last name are required." };
    }

    // Reading the row back proves the write landed. An update that matches
    // nothing still succeeds, and the guard would send the person straight
    // back here with no word of why.
    const { data: saved, error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", user.id)
      .select("id");

    if (error || !saved?.length) {
      return {
        error: true,
        message: "Your name could not be saved. Please try again.",
      };
    }

    return { error: false, message: "" };
  });

/** Records that the welcome tutorial has opened, so it never opens on its own again. */
export const markWelcomeTutorialSeenFn = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, user } = await requireActiveSession();

  const { error } = await supabase
    .from("profiles")
    .update({ welcome_tutorial_seen: true })
    .eq("id", user.id);

  return { error: Boolean(error) };
});
