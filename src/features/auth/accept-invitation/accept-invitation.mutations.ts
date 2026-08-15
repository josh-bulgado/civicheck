import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";
import { acceptInvitationInputSchema } from "./accept-invitation.schema";

export const acceptStaffInvitationFn = createServerFn({ method: "POST" })
  .validator(acceptInvitationInputSchema)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      return {
        error: true,
        message: "This invitation is invalid or has expired.",
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: data.password,
      data: {
        invitation_accepted_at: new Date().toISOString(),
      },
    });

    if (error) {
      return { error: true, message: error.message };
    }

    return {
      error: false,
      message: "Your staff account is ready.",
    };
  });
