import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { User } from "@supabase/supabase-js";
import {
  clearSessionScope,
  commitSupabaseCookies,
  clearSupabaseAuthCookies,
  getSupabaseServerClient,
  getSupabaseAdminClient,
  getSupabaseStatelessClient,
  setSessionScope,
} from "~/utils/supabase";
import { getAppUrl } from "~/utils/app-url";
import { sendEmail } from "~/utils/resend";
import {
  renderVerificationEmail,
  renderVerificationEmailText,
} from "~/utils/email-template";
import { findAuthUserByEmail } from "~/server/auth-users";
import {
  allowAttempt,
  getClientIp,
  RATE_LIMITS,
  TOO_MANY_ATTEMPTS,
} from "~/server/rate-limit";
import {
  recordAuthenticationSecurityEvent,
  recordSessionStarted,
} from "~/features/system-admin/security-center.server";
import type { Role } from "~/lib/permissions";
import {
  credentialsSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  newPasswordInputSchema,
  oauthProviderSchema,
  otpVerificationSchema,
  recoveryVerificationSchema,
  signupInputSchema,
} from "./auth.schema";
import { describeWeakPassword } from "./password-error";
import { getSignupErrorField } from "./signup-error";
import { authAttemptFailure, checkAuthLockout, clearAuthAttempts, reserveAuthAttempt, finishAuthAttempt } from "~/server/auth-attempts";
import { INVALID_CREDENTIALS, compareDummyPassword, getLoginAccountInfo, runAuthBackground, sendLoginSecurityNotification, sendPasswordChangedNotification } from "~/server/auth-security";
import { issueOAuthCaptchaProof, verifyCaptcha, verifyInvisibleCaptcha } from "./captcha.server";
import { consumePasswordResetGrant, deliverRecoveryCode, reserveRecoverySend, verifyRecoveryCode } from "./recovery.server";
import { RECOVERY_CONFIRMATION, RECOVERY_INVALID_CODE, RECOVERY_UNAVAILABLE } from "./recovery";
import {
  clearIssuedOtps,
  describeRejectedOtp,
  recordIssuedOtp,
  type OtpPurpose,
} from "./otp-codes.server";

/** Supabase's single error for a code that is wrong, replaced, used or expired. */
function isRejectedOtpError(error: { code?: string; message?: string }) {
  return (
    error.code === "otp_expired" ||
    /expired or is invalid/i.test(error.message ?? "")
  );
}

/** Each code email lands in someone's inbox and replaces the code they hold. */
async function allowCodeEmail(email: string) {
  return (
    (await allowAttempt("otp-send:email", email, RATE_LIMITS.otpSendPerEmail)) &&
    (await allowAttempt("otp-send:ip", getClientIp(), RATE_LIMITS.otpSendPerIp))
  );
}

/** Bounds guesses at a 6-digit code, per inbox and per visitor. */
async function allowCodeCheck(purpose: OtpPurpose, email: string) {
  return (
    (await allowAttempt(`otp-verify:${purpose}`, email, RATE_LIMITS.otpVerifyPerEmail, purpose === "recovery")) &&
    (await allowAttempt("otp-verify:ip", getClientIp(), RATE_LIMITS.otpVerifyPerIp, purpose === "recovery"))
  );
}

/** Matches the code lifetime promised in the verification email. */
const PENDING_SIGNUP_LIFETIME_MS = 60 * 60 * 1000;

const PENDING_SIGNUP_MESSAGE =
  "This email is waiting to be verified. Enter the code we emailed you, or sign in with the password you chose to get a new code.";

/**
 * Whether a repeat sign-up may delete the unconfirmed account already holding
 * this email and start over. Only ever an applicant's own stalled sign-up:
 * never a pending staff invitation, and never someone else's sign-up still
 * inside its code lifetime. Otherwise anyone could recreate a stranger's
 * pending account with a password of their choosing, and the real owner would
 * then confirm it with the code we email them.
 */
async function canRestartPendingSignup(
  adminSupabase: ReturnType<typeof getSupabaseAdminClient>,
  existingUser: User,
  password: string,
) {
  if (existingUser.email_confirmed_at) return false;
  if (existingUser.user_metadata?.invited_role) return false;

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", existingUser.id)
    .maybeSingle();
  if (profile && profile.role !== "applicant") return false;

  // Its code has expired, so nobody can be part-way through confirming it.
  const age = Date.now() - new Date(existingUser.created_at).getTime();
  if (age > PENDING_SIGNUP_LIFETIME_MS) return true;

  // Still live: only the person who chose its password may start over.
  const { error } = await getSupabaseStatelessClient().auth.signInWithPassword({
    email: existingUser.email ?? "",
    password,
  });
  return !!error && /email not confirmed/i.test(error.message ?? "");
}

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
      category: "auth",
      to: params.email,
      subject: "Your CiviCheck email verification code",
      html: renderVerificationEmail(otp),
      text: renderVerificationEmailText(otp),
    });
  } catch (sendError) {
    console.error("Resend sending error:", sendError);
    return {
      error: true,
      message: `Failed to send the verification code: ${
        sendError instanceof Error ? sendError.message : String(sendError)
      }`,
    };
  }

  await recordIssuedOtp(params.email, "signup", otp);
  return { error: false };
}

export const loginWithEmailFn = createServerFn({ method: "POST" })
  .validator(loginInputSchema)
  .handler(async ({ data }) => {
    const captcha = await verifyInvisibleCaptcha(data["g-recaptcha-response"]);
    if (captcha.error) return captcha;
    const attempt = await reserveAuthAttempt("sign-in", data.email);
    if (!attempt.allowed) {
      if (attempt.lockedUntil) setResponseHeader("Retry-After", String(Math.max(1, Math.ceil((attempt.lockedUntil - Date.now()) / 1000))));
      return authAttemptFailure(attempt, attempt.message ?? TOO_MANY_ATTEMPTS);
    }

    const sessionOnly = data.keepSignedIn !== true;
    const supabase = getSupabaseServerClient({ sessionOnly, deferCookies: true, requestTimeoutMs: 8000 });
    try {
      const account = await getLoginAccountInfo(data.email);
      if (attempt.elevated) await new Promise(resolve => setTimeout(resolve, 500));
      // Supabase owns real hashes. Missing/passwordless accounts get equivalent
      // bcrypt work here, then still take the same Auth request path.
      if (account.needsDummyPassword) await compareDummyPassword(data.password, account.bcryptCost);
      const { data: loginData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // An unconfirmed account goes on to verify its email from the login form,
      // and that verification opens the session — so it needs the choice too.
      const passwordAccepted = !error || error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message ?? "");
      const completed = await finishAuthAttempt(attempt, passwordAccepted);
      if (passwordAccepted) {
        setSessionScope(sessionOnly);
      }

      if (error) {
        await runAuthBackground(recordAuthenticationSecurityEvent({
          type: "sign_in_failed",
          email: data.email,
        }));
        if (completed.notify && account.email) {
          await runAuthBackground(sendLoginSecurityNotification(account.email));
        }
        // Correct credentials for an unconfirmed account continue to verification.
        if (/email not confirmed/i.test(error.message ?? "")) {
          return { error: true, message: "Email not confirmed" };
        }
        if (completed.lockedUntil) setResponseHeader("Retry-After", String(Math.max(1, Math.ceil((completed.lockedUntil - Date.now()) / 1000))));
        return authAttemptFailure(completed, INVALID_CREDENTIALS);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, access_status")
        .eq("id", loginData.user.id)
        .single();
      if ((profile?.access_status ?? "active") !== "active") {
        await supabase.auth.signOut();
        clearSessionScope();
        return { error: true, message: "This account is not active." };
      }
      if (profile?.role) {
        await recordSessionStarted({
          actorProfileId: loginData.user.id,
          role: profile.role as Role,
          method: "password",
        });
      }
      commitSupabaseCookies(supabase);
      // Who just signed in, so the first screen can be drawn for them while their
      // account details are still loading. See `hintCurrentUser`.
      return {
        error: false,
        userId: loginData.user.id,
        role: (profile?.role as Role | undefined) ?? null,
      };
    } catch {
      // No session cookies have been committed. The short database lease
      // bounds abandoned attempts if Auth or its completion becomes unavailable.
      return { error: true, message: "Sign-in is temporarily unavailable. Please try again shortly." };
    }
  });

export const loginWithOAuthFn = createServerFn({ method: "POST" })
  .validator(oauthProviderSchema)
  .handler(async ({ data }) => {
    // Optional form email provides early feedback. The callback always checks
    // the provider-verified email too, so omitting/changing this cannot bypass it.
    if (data.intent !== "login" && data.email) {
      const lockout = await checkAuthLockout(data.email);
      if (!lockout.allowed) return authAttemptFailure(lockout, lockout.message!);
    }
    if (data.intent !== "login") {
      const captcha = await verifyCaptcha(data.captchaToken);
      if (captcha.error) return captcha;
    }
    // The session is opened later, by /auth/callback, so the choice rides
    // along as the marker cookie that request will read.
    const sessionOnly = data.keepSignedIn !== true;
    setSessionScope(sessionOnly);
    const supabase = getSupabaseServerClient({ sessionOnly });

    const redirectTo = `${getAppUrl()}/auth/callback`;

    const { error, data: authData } = await supabase.auth.signInWithOAuth({
      provider: data.provider,
      options: {
        redirectTo,
        ...(data.provider === "google" ? { scopes: "openid email profile" } : {}),
      },
    });

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected OAuth provider error occurred. Please check your Supabase configuration."
        : error.message;
      return { error: true, message: cleanMessage };
    }

    issueOAuthCaptchaProof(data.intent);
    return { url: authData.url };
  });

export const signupFn = createServerFn({ method: "POST" })
  .validator(signupInputSchema)
  .handler(async ({ data }) => {
    const captcha = await verifyCaptcha(data.captchaToken);
    if (captcha.error) return captcha;
    const attempt = await reserveAuthAttempt("sign-up", data.email);
    if (!attempt.allowed) {
      return authAttemptFailure(attempt, attempt.message ?? TOO_MANY_ATTEMPTS);
    }

    const adminSupabase = getSupabaseAdminClient();
    // Already trimmed and checked by the validator; blank means "none". The
    // validator also guarantees a middle name and "has none" never coexist.
    const middleName = data.middleName || undefined;
    const hasNoMiddleName = data.hasNoMiddleName;
    const suffix = data.suffix || undefined;
    let signUpResult = await adminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false,
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        middle_name: middleName,
        has_no_middle_name: hasNoMiddleName,
        suffix,
      },
    });

    if (signUpResult.error) {
      const isAlreadyRegistered =
        signUpResult.error.code === "email_exists" ||
        signUpResult.error.code === "user_already_exists" ||
        signUpResult.error.message.includes("already been registered") ||
        signUpResult.error.message.includes("already exists");

      if (isAlreadyRegistered) {
        // If the lookup fails there is no user to find, and the "already
        // registered" error below is the right answer anyway.
        const existingUser = await findAuthUserByEmail(
          adminSupabase,
          data.email,
        );

        if (
          existingUser &&
          !existingUser.email_confirmed_at &&
          !(await canRestartPendingSignup(
            adminSupabase,
            existingUser,
            data.password,
          ))
        ) {
          return {
            ...authAttemptFailure(attempt, PENDING_SIGNUP_MESSAGE),
            field: attempt.lockedUntil ? undefined : "email" as const,
          };
        }

        // A stalled sign-up of this applicant's own: start it over.
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
              has_no_middle_name: hasNoMiddleName,
              suffix,
            },
          });
        }
      }
    }

    if (signUpResult.error) {
      const isJsonEmpty =
        signUpResult.error.message === "{}" || !signUpResult.error.message;
      const cleanMessage =
        describeWeakPassword(signUpResult.error) ??
        (isJsonEmpty
          ? "An unexpected registration error occurred. Please check your SMTP configuration in the Supabase Dashboard."
          : signUpResult.error.message);
      return {
        ...authAttemptFailure(attempt, cleanMessage),
        field: attempt.lockedUntil ? undefined : getSignupErrorField(signUpResult.error),
      };
    }

    // The profile row is created by a trigger that only reads the first and last
    // name out of the metadata, so the middle name, the "no middle name" answer
    // and the suffix have to be written onto it.
    const newProfileId = signUpResult.data?.user?.id;
    if (newProfileId && (middleName || hasNoMiddleName || suffix)) {
      await adminSupabase
        .from("profiles")
        .update({
          middle_name: middleName ?? null,
          has_no_middle_name: hasNoMiddleName,
          suffix: suffix ?? null,
        })
        .eq("id", newProfileId);
    }

    // Failed account creation must not spend the separate email-send allowance.
    if (!(await allowCodeEmail(data.email))) {
      return authAttemptFailure(attempt, TOO_MANY_ATTEMPTS);
    }
    const otpResult = await sendSignupOtpEmail(adminSupabase, {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      userMetadata: {
        first_name: data.firstName,
        last_name: data.lastName,
        middle_name: middleName,
        has_no_middle_name: hasNoMiddleName,
        suffix,
      },
    });

    if (otpResult.error) {
      return authAttemptFailure(attempt, otpResult.message ?? "Could not send your verification code.");
    }

    await clearAuthAttempts("sign-up", data.email);
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
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    const INVALID_CREDENTIALS = "Invalid email or password.";
    // This checks a password and then sends a code, so it is held to both limits.
    const attempt = await reserveAuthAttempt("sign-in", data.email);
    if (!attempt.allowed) {
      return { error: true, message: TOO_MANY_ATTEMPTS };
    }
    const account = await getLoginAccountInfo(data.email);
    if (account.needsDummyPassword) await compareDummyPassword(data.password, account.bcryptCost);
    if (attempt.elevated) await new Promise(resolve => setTimeout(resolve, 500));
    const statelessSupabase = getSupabaseStatelessClient();
    const { error: signInError } =
      await statelessSupabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

    const passwordAccepted = !signInError || /email not confirmed/i.test(signInError.message ?? "");
    const completed = await finishAuthAttempt(attempt, passwordAccepted);
    if (completed.notify && account.email) await runAuthBackground(sendLoginSecurityNotification(account.email));
    if (
      !signInError ||
      !/email not confirmed/i.test(signInError.message ?? "")
    ) {
      return { error: true, message: INVALID_CREDENTIALS };
    }

    if (!(await allowCodeEmail(data.email))) return { error: true, message: TOO_MANY_ATTEMPTS };

    const adminSupabase = getSupabaseAdminClient();
    const existingUser = await findAuthUserByEmail(adminSupabase, data.email);

    if (!existingUser) {
      return { error: true, message: INVALID_CREDENTIALS };
    }

    const userMetadata = existingUser.user_metadata ?? {};
    const firstName =
      (userMetadata.first_name as string | undefined) || "there";
    const middleName = userMetadata.middle_name as string | undefined;
    const hasNoMiddleName = userMetadata.has_no_middle_name === true;
    const suffix = userMetadata.suffix as string | undefined;

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

    if (middleName || hasNoMiddleName || suffix) {
      await adminSupabase
        .from("profiles")
        .update({
          middle_name: middleName ?? null,
          has_no_middle_name: hasNoMiddleName,
          suffix: suffix ?? null,
        })
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
  .validator(otpVerificationSchema)
  .handler(async ({ data }) => {
    if (!(await allowCodeCheck("signup", data.email))) {
      return { error: true, message: TOO_MANY_ATTEMPTS };
    }

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      email: data.email,
      token: data.token,
      type: "signup",
    });

    if (error) {
      if (isRejectedOtpError(error)) {
        return {
          error: true,
          message: await describeRejectedOtp(data.email, "signup", data.token),
        };
      }

      const isJsonEmpty = error.message === "{}" || !error.message;
      const cleanMessage = isJsonEmpty
        ? "An unexpected verification error occurred."
        : error.message;
      return {
        error: true,
        message: cleanMessage,
      };
    }

    await clearIssuedOtps(data.email, "signup");
    return { error: false };
  });

export const resetPasswordFn = createServerFn({ method: "POST" })
  .validator(newPasswordInputSchema)
  .handler(async ({ data }) => {
    try {
      const userId = await consumePasswordResetGrant();
      if (!userId) return { error: true, message: RECOVERY_INVALID_CODE };
      const admin = getSupabaseAdminClient({ requestTimeoutMs: 8000 });
      const { data: changed, error } = await admin.auth.admin.updateUserById(userId, { password: data.password });
      if (error || !changed.user) {
        return { error: true, message: `${describeWeakPassword(error ?? {}) ?? "Password reset could not be completed."} Request a new reset code before trying again.` };
      }
      // This existing RPC revokes refresh sessions AND sets the profile marker
      // which makes the app reject already-issued access tokens immediately.
      const { error: revokeError } = await admin.rpc("revoke_user_sessions", { target_user_id: userId });
      clearSupabaseAuthCookies();
      if (changed.user.email) await runAuthBackground(sendPasswordChangedNotification(changed.user.email));
      if (revokeError) {
        return { error: true, message: "Your password was changed, but we couldn't finish signing out other sessions. Please contact support." };
      }
      return { error: false, message: "Password updated successfully." };
    } catch {
      return { error: true, message: RECOVERY_UNAVAILABLE };
    }
  });

export const forgotPasswordFn = createServerFn({ method: "POST" })
  .validator(forgotPasswordInputSchema)
  .handler(async ({ data }) => {
    const captcha = await verifyInvisibleCaptcha(data["g-recaptcha-response"]);
    if (captcha.error) return captcha;
    try {
      // No lookup or email occurs before CAPTCHA and the atomic send allowance.
      const reservation = await reserveRecoverySend(data.email);
      if (reservation.allowed) await runAuthBackground(deliverRecoveryCode(data.email, reservation));
      else setResponseHeader("Retry-After", String(reservation.retryAfterSeconds));
      return { error: false, message: RECOVERY_CONFIRMATION,
        retryAfterSeconds: reservation.retryAfterSeconds };
    } catch {
      return { error: true, message: RECOVERY_UNAVAILABLE };
    }
  });

export const verifyRecoveryOtpFn = createServerFn({ method: "POST" })
  .validator(recoveryVerificationSchema)
  .handler(async ({ data }) => {
    // No CAPTCHA here. The per-IP gate bounds cross-account guesses; the
    // challenge RPC enforces five wrong guesses for this particular code.
    if (!(await allowAttempt("recovery-verify:ip", getClientIp(), RATE_LIMITS.otpVerifyPerIp, true))) {
      return { error: true, message: TOO_MANY_ATTEMPTS };
    }
    try { return await verifyRecoveryCode(data.email, data.token); }
    catch { return { error: true, message: RECOVERY_UNAVAILABLE }; }
  });
