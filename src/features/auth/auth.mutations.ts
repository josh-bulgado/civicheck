import { createServerFn } from "@tanstack/react-start";
import {
  getSupabaseServerClient,
  getSupabaseAdminClient,
  getSupabaseStatelessClient,
} from "~/utils/supabase";
import { getAppUrl } from "~/utils/app-url";
import { sendEmail } from "~/utils/resend";
import { renderOtpEmail } from "~/utils/email-template";
import { requireActiveSession, isOperationalRole } from "~/server/auth";
import { recordAuthenticationSecurityEvent } from "~/features/system-admin/security-center.server";
import type { Role } from "~/lib/permissions";

/**
 * Generates a fresh signup OTP for a user that was just created (or
 * recreated) with `email_confirm: false`, and emails it. Shared by the
 * initial signup and by the "resend from login" path, which both land the
 * user on the same unconfirmed-account state.
 */
async function sendSignupOtpEmail(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  params: {
    email: string;
    password: string;
    firstName: string;
    userMetadata: Record<string, unknown>;
  },
) {
  const { data: linkData, error: linkError } =
    await adminSupabase.auth.admin.generateLink({
      type: "signup",
      email: params.email,
      password: params.password,
      options: { data: params.userMetadata },
    });

  const otp = linkData?.properties?.email_otp;

  if (linkError || !otp) {
    return {
      error: true,
      message:
        linkError?.message || "Failed to generate the email verification code.",
    };
  }

  try {
    await sendEmail({
      to: params.email,
      subject: "Confirm your CiviCheck account",
      html: renderOtpEmail({
        preheader: "Use this code to confirm your CiviCheck account.",
        label: "Email verification",
        greeting: `Hello ${params.firstName.trim()},`,
        heading: "Confirm your email address",
        paragraphs: [
          "Thanks for creating a CiviCheck account. Enter the code below to activate it — you can then file civil registry requests online and follow them from submission to release.",
        ],
        code: otp,
        noteLines: [
          "This code expires in 1 hour and can only be used once.",
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
      message: `Failed to send the verification code: ${sendError.message}`,
    };
  }

  return { error: false };
}

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

    const redirectTo = `${getAppUrl()}/auth/callback`;

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
      const isAlreadyRegistered =
        signUpResult.error.message.includes("already been registered") ||
        signUpResult.error.message.includes("already exists");

      if (isAlreadyRegistered) {
        // Fetch users to check if this existing user is unconfirmed
        const {
          data: { users },
          error: listError,
        } = await adminSupabase.auth.admin.listUsers({
          perPage: 1000,
        });

        const existingUser = users?.find(
          (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
        );

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
      const isJsonEmpty =
        signUpResult.error.message === "{}" || !signUpResult.error.message;
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

    const otpResult = await sendSignupOtpEmail(adminSupabase, {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      userMetadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        middle_name: middleName,
      },
    });

    if (otpResult.error) {
      return otpResult;
    }

    return {
      error: false,
      message: "Please check your email for your verification code.",
    };
  });

/**
 * Resends a signup OTP for an account the applicant already created but
 * never confirmed — reached from the login form when a correct password
 * comes back "email not confirmed". The password is re-verified here
 * (rather than trusted from the caller) because this recreates the account
 * with whatever password is supplied: without that check, anyone could hand
 * this endpoint a stranger's unconfirmed email and a password of their own
 * choosing and take the account over before its real owner ever confirms it.
 */
export const resendSignupOtpFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const INVALID_CREDENTIALS = "Invalid email or password.";
    const statelessSupabase = getSupabaseStatelessClient();
    const { error: signInError } =
      await statelessSupabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

    if (
      !signInError ||
      !/email not confirmed/i.test(signInError.message ?? "")
    ) {
      return { error: true, message: INVALID_CREDENTIALS };
    }

    const adminSupabase = getSupabaseAdminClient();
    const {
      data: { users },
    } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );

    if (!existingUser) {
      return { error: true, message: INVALID_CREDENTIALS };
    }

    const userMetadata = existingUser.user_metadata ?? {};
    const firstName =
      (userMetadata.first_name as string | undefined) || "there";
    const middleName = userMetadata.middle_name as string | undefined;

    // Recreate rather than update: Supabase Auth has no admin call to mint a
    // fresh unconfirmed state for an existing user, so this mirrors the same
    // delete-and-recreate signupFn already does for a repeat signup attempt.
    await adminSupabase.auth.admin.deleteUser(existingUser.id);
    const { data: created, error: createError } =
      await adminSupabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: false,
        user_metadata: userMetadata,
      });

    if (createError || !created?.user) {
      const isJsonEmpty = !createError?.message || createError.message === "{}";
      return {
        error: true,
        message: isJsonEmpty
          ? "An unexpected error occurred while resending the code."
          : createError.message,
      };
    }

    if (middleName) {
      await adminSupabase
        .from("profiles")
        .update({ middle_name: middleName })
        .eq("id", created.user.id);
    }

    return sendSignupOtpEmail(adminSupabase, {
      email: data.email,
      password: data.password,
      firstName,
      userMetadata,
    });
  });

export const verifySignupOtpFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; token: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "signup",
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected verification error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    return { error: false };
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

    // Generate a recovery OTP code
    const { data: linkData, error } =
      await adminSupabase.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
      });

    if (error) {
      // Unregistered address: answer exactly as we do for a real one so this
      // form can't be used to discover which emails have accounts.
      if (error.status === 404 || error.code === "user_not_found") {
        return {
          error: false,
          message: "Password reset code sent.",
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

    const otp = linkData?.properties?.email_otp;

    if (!otp) {
      return {
        error: true,
        message: "Failed to generate the password reset code.",
      };
    }

    try {
      await sendEmail({
        to: data.email,
        subject: "Reset your CiviCheck password",
        html: renderOtpEmail({
          preheader: "Use this code to reset your CiviCheck password.",
          label: "Password reset",
          heading: "Reset your password",
          paragraphs: [
            "We received a request to reset the password for your CiviCheck account. Enter the code below to continue.",
          ],
          code: otp,
          noteLines: ["This code expires in 1 hour and can only be used once."],
          footerNote:
            "If you did not request a password reset, you can safely ignore this email — your password stays the same.",
        }),
      });
    } catch (sendError: any) {
      console.error("Resend sending error:", sendError);
      return {
        error: true,
        message: `Failed to send the password reset code: ${sendError.message}`,
      };
    }

    return {
      error: false,
      message: "Password reset code sent.",
    };
  });

export const verifyRecoveryOtpFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; token: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "recovery",
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected verification error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    return { error: false };
  });
