import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient, getSupabaseAdminClient } from "~/utils/supabase";
import { sendEmail } from "~/utils/resend";
import { requireActiveSession } from "~/server/auth";

export const loginWithEmailFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected login server error occurred. Please check your Supabase connection."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    const { data: profile } = await supabase.from("profiles").select("access_status").eq("id", loginData.user.id).single();
    if ((profile?.access_status ?? "active") !== "active") {
      await supabase.auth.signOut();
      return { error: true, message: "This account is not active." };
    }
    return { error: false };
  });

export const loginWithOAuthFn = createServerFn({ method: "POST" })
  .validator((d: { provider: "google" | "apple" }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();

    const devFallback =
      process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";
    const redirectTo = `${process.env.APP_URL || devFallback}/auth/callback`;

    const { error, data: authData } = await supabase.auth.signInWithOAuth({
      provider: data.provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected OAuth provider error occurred. Please check your Supabase configuration."
        : error.message;
      return { error: true, message: cleanMessage };
    }

    return { url: authData.url };
  });

export const signupFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      redirectUrl?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const adminSupabase = getSupabaseAdminClient();
    let signUpResult = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
      },
    });

    if (signUpResult.error) {
      const isAlreadyRegistered = signUpResult.error.message.includes("already been registered") || 
                                  signUpResult.error.message.includes("already exists");
      
      if (isAlreadyRegistered) {
        // Fetch users to check if this existing user is unconfirmed
        const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers({
          perPage: 1000
        });

        const existingUser = users?.find(u => u.email?.toLowerCase() === data.email.toLowerCase());
        
        // If the user exists but has not confirmed their email, delete it so they can retry registration
        if (existingUser && !existingUser.email_confirmed_at) {
          await adminSupabase.auth.admin.deleteUser(existingUser.id);
          
          signUpResult = await adminSupabase.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: false,
            user_metadata: {
              first_name: data.firstName,
              last_name: data.lastName,
            },
          });
        }
      }
    }

    if (signUpResult.error) {
      const isJsonEmpty = signUpResult.error.message === "{}" || !signUpResult.error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected registration error occurred. Please check your SMTP configuration in the Supabase Dashboard."
        : signUpResult.error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    // Generate signup verification link
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: {
        redirectTo: `${process.env.APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (linkError) {
      return {
        error: true,
        message: linkError.message || "Failed to generate email confirmation link.",
      };
    }

    try {
      const actionLink = linkData.properties?.action_link;
      if (!actionLink) {
        throw new Error("No action link was returned from Supabase Auth.");
      }

      await sendEmail({
        to: data.email,
        subject: "Confirm your CiviCheck Account",
        html: `
          <div style="font-family: 'Public Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #DCE2EA; border-radius: 8px; color: #17212B;">
            <h2 style="color: #0049A8;">Confirm your CiviCheck account</h2>
            <p>Thank you for signing up for CiviCheck. Please click the button below to confirm your email address and activate your account:</p>
            <div style="margin: 30px 0;">
              <a href="${actionLink}" style="background-color: #0049A8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Confirm Email Address</a>
            </div>
            <p style="color: #5D6876; font-size: 14px;">If the button doesn't work, you can <a href="${actionLink}" style="color: #0049A8; text-decoration: underline;">click here</a> or copy and paste the following link into your browser:</p>
            <p style="color: #5D6876; font-size: 14px; word-break: break-all;">${actionLink}</p>
            <hr style="border: 0; border-top: 1px solid #DCE2EA; margin: 20px 0;" />
            <p style="color: #5D6876; font-size: 12px;">City Civil Registrar Office · City Government of Legazpi</p>
          </div>
        `,
      });
    } catch (sendError: any) {
      console.error("Resend sending error:", sendError);
      return {
        error: true,
        message: `Account created, but failed to send verification email: ${sendError.message}`,
      };
    }

    return {
      error: false,
      message: "Please check your email to confirm your account before signing in.",
      redirectUrl: undefined,
    };
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected password reset server error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    return {
      error: false,
      message: "Password updated successfully.",
    };
  });

export const forgotPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const adminSupabase = getSupabaseAdminClient();
    
    // Generate recovery link
    const { data: linkData, error } = await adminSupabase.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: {
        redirectTo: `${process.env.APP_URL || "http://localhost:3000"}/reset-password`,
      },
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected forgot password request server error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    try {
      const actionLink = linkData.properties?.action_link;
      if (!actionLink) {
        throw new Error("No action link was returned from Supabase Auth.");
      }

      await sendEmail({
        to: data.email,
        subject: "Reset your CiviCheck Password",
        html: `
          <div style="font-family: 'Public Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #DCE2EA; border-radius: 8px; color: #17212B;">
            <h2 style="color: #0049A8;">Reset your CiviCheck password</h2>
            <p>We received a request to reset your password. Please click the button below to set a new password:</p>
            <div style="margin: 30px 0;">
              <a href="${actionLink}" style="background-color: #0049A8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #5D6876; font-size: 14px;">If the button doesn't work, you can <a href="${actionLink}" style="color: #0049A8; text-decoration: underline;">click here</a> or copy and paste the following link into your browser:</p>
            <p style="color: #5D6876; font-size: 14px; word-break: break-all;">${actionLink}</p>
            <hr style="border: 0; border-top: 1px solid #DCE2EA; margin: 20px 0;" />
            <p style="color: #5D6876; font-size: 12px;">City Civil Registrar Office · City Government of Legazpi</p>
          </div>
        `,
      });
    } catch (sendError: any) {
      console.error("Resend sending error:", sendError);
      return {
        error: true,
        message: `Failed to send reset password email: ${sendError.message}`,
      };
    }

    return {
      error: false,
      message: "Password reset link sent.",
    };
  });
