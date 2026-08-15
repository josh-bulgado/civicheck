import { createServerFn } from "@tanstack/react-start";
import { acceptInvitationInputSchema } from "./accept-invitation.schema";
import { isOperationalRole, requireActiveSession } from "~/server/auth";

export const acceptStaffInvitationFn = createServerFn({ method: "POST" })
  .validator(acceptInvitationInputSchema)
  .handler(async ({ data }) => {
    let session;
    try {
      session = await requireActiveSession();
    } catch {
      return {
        error: true,
        message: "This invitation is invalid or has expired.",
      };
    }
    if (!isOperationalRole(session.role)) {
      return { error: true, message: "This account is not a staff invitation." };
    }
    const { supabase } = session;

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
