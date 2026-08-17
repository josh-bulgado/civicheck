import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient, getSupabaseAdminClient } from "~/utils/supabase";
import { sendEmail } from "~/utils/resend";
import { renderActionEmail } from "~/utils/email-template";
import { requireActiveSession, isOperationalRole } from "~/server/auth";
import { recordAuthenticationSecurityEvent } from "~/features/system-admin/security-center.server";
import type { Role } from "~/lib/permissions";

export const loginWithEmailFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      await recordAuthenticationSecurityEvent({
        type: "sign_in_failed",
        email: data.email,
      });
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected login server error occurred. Please check your Supabase connection."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, access_status")
      .eq("id", loginData.user.id)
      .single();
    if ((profile?.access_status ?? "active") !== "active") {
      await supabase.auth.signOut();
      return { error: true, message: "This account is not active." };
    }
    if (profile?.role === "admin" || profile?.role === "system_admin") {
      await recordAuthenticationSecurityEvent({
        type: "admin_session_started",
        actorProfileId: loginData.user.id,
      });
    } else if (profile?.role && isOperationalRole(profile.role as Role)) {
      await recordAuthenticationSecurityEvent({
        type: "staff_session_started",
        actorProfileId: loginData.user.id,
      });
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
      middleName?: string;
      redirectUrl?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const adminSupabase = getSupabaseAdminClient();
    const middleName = data.middleName?.trim() || undefined;
    let signUpResult = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        middle_name: middleName,
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
              middle_name: middleName,
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

    // The profile row is created by a trigger that only reads the first and last
    // name out of the metadata, so the middle name has to be written onto it.
    const newProfileId = signUpResult.data?.user?.id;
    if (newProfileId && middleName) {
      await adminSupabase
        .from("profiles")
        .update({ middle_name: middleName })
        .eq("id", newProfileId);
    }

    // Generate signup verification link
    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          middle_name: middleName,
        },
      },
    });

    const hashedToken = linkData?.properties?.hashed_token;

    if (linkError || !hashedToken) {
      return {
        error: true,
        message: linkError?.message || "Failed to generate email confirmation link.",
      };
    }

    // Point at our own callback so the session is verified server-side and stored
    // in cookies. Supabase's own action_link returns tokens in the URL fragment,
    // which this app (server-side sessions only) can never read.
    const confirmationUrl = new URL(
      "/auth/callback",
      process.env.APP_URL || "http://localhost:3000",
    );
    confirmationUrl.searchParams.set("token_hash", hashedToken);
    confirmationUrl.searchParams.set("type", "signup");
    confirmationUrl.searchParams.set("next", "/dashboard");

    try {
      const actionLink = confirmationUrl.toString();

      await sendEmail({
        to: data.email,
        subject: "Confirm your CiviCheck account",
        html: renderActionEmail({
          preheader:
            "Confirm your email address to activate your CiviCheck account.",
          label: "Email verification",
          greeting: `Hello ${data.firstName.trim()},`,
          heading: "Confirm your email address",
          paragraphs: [
            "Thanks for creating a CiviCheck account. Confirm your email address to activate it — you can then file civil registry requests online and follow them from submission to release.",
          ],
          actionLabel: "Confirm email address",
          actionUrl: actionLink,
          noteLines: [
            "This link signs you in and can only be used once.",
            "You will not be able to sign in until your email is confirmed.",
          ],
          footerNote:
            "If you did not create a CiviCheck account, you can safely ignore this email.",
        }),
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
      // Supabase rejects reusing the current password with this code.
      if (error.code === "same_password") {
        return {
          error: true,
          message:
            "Your new password must be different from your current password.",
        };
      }

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
    });

    if (error) {
      // Unregistered address: answer exactly as we do for a real one so this
      // form can't be used to discover which emails have accounts.
      if (error.status === 404 || error.code === "user_not_found") {
        return {
          error: false,
          message: "Password reset link sent.",
        };
      }

      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected forgot password request server error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    const hashedToken = linkData?.properties?.hashed_token;

    if (!hashedToken) {
      return {
        error: true,
        message: "Failed to generate the password reset link.",
      };
    }

    const recoveryUrl = new URL(
      "/auth/callback",
      process.env.APP_URL || "http://localhost:3000",
    );
    recoveryUrl.searchParams.set("token_hash", hashedToken);
    recoveryUrl.searchParams.set("type", "recovery");
    recoveryUrl.searchParams.set("next", "/reset-password");

    try {
      const actionLink = recoveryUrl.toString();

      await sendEmail({
        to: data.email,
        subject: "Reset your CiviCheck password",
        html: renderActionEmail({
          preheader: "Use this link to set a new CiviCheck password.",
          label: "Password reset",
          heading: "Reset your password",
          paragraphs: [
            "We received a request to reset the password for your CiviCheck account. Use the button below to set a new one.",
          ],
          actionLabel: "Reset password",
          actionUrl: actionLink,
          noteLines: ["This link can only be used once."],
          footerNote:
            "If you did not request a password reset, you can safely ignore this email — your password stays the same.",
        }),
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
