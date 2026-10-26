import { createServerFn } from "@tanstack/react-start";
import {
  newPasswordSchema,
  PASSWORD_NUMBER_MESSAGE,
  passwordHasNumber,
} from "~/features/auth/auth.schema";
import { NO_SUFFIX, SUFFIXES } from "~/lib/subject-fields";
import { requireActiveSession } from "~/server/auth";
import { AVATAR_BUCKET, forgetAvatarUrl } from "~/server/avatar";
import { allowAttempt, RATE_LIMITS, TOO_MANY_ATTEMPTS } from "~/server/rate-limit";
import { getSupabaseStatelessClient } from "~/utils/supabase";
import { recordPasswordChanged } from "./account-audit.server";

type UpdateProfileInput = {
  firstName: string;
  middleName: string;
  /**
   * Sent by the settings form, which asks the question. Onboarding doesn't ask
   * it, so leaving it out keeps the stored answer and skips the check below.
   */
  hasNoMiddleName?: boolean;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  sex: "" | "male" | "female";
  phoneNumber: string;
};

const SUFFIX_VALUES: string[] = SUFFIXES.filter(
  (suffix) => suffix.value !== NO_SUFFIX,
).map((suffix) => suffix.value);

function nullIfBlank(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export const updateMyProfileFn = createServerFn({ method: "POST" })
  .validator((d: UpdateProfileInput) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession();

    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    if (!firstName || !lastName) {
      return { error: true, message: "First name and last name are required." };
    }

    // Same rule as signup: a middle name is given or declared absent, never
    // both and never neither, so a blank field is not mistaken for "none".
    const middleName = data.middleName.trim();
    if (data.hasNoMiddleName !== undefined) {
      if (data.hasNoMiddleName && middleName) {
        return {
          error: true,
          message: "Clear the middle name or untick the box.",
        };
      }
      if (!data.hasNoMiddleName && !middleName) {
        return {
          error: true,
          message:
            "Enter your middle name, or tick the box if you don't have one.",
        };
      }
    }

    if (data.suffix && !SUFFIX_VALUES.includes(data.suffix)) {
      return { error: true, message: "Choose a suffix from the list." };
    }

    const phoneNumber = data.phoneNumber.trim();
    if (phoneNumber && !/^9\d{9}$/.test(phoneNumber)) {
      return {
        error: true,
        message: "Enter a valid 10-digit mobile number, e.g. 9171234567.",
      };
    }

    if (data.sex && data.sex !== "male" && data.sex !== "female") {
      return { error: true, message: "Select a valid sex." };
    }

    const dateOfBirth = data.dateOfBirth.trim();
    if (dateOfBirth) {
      const parsed = new Date(`${dateOfBirth}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        return { error: true, message: "Enter a valid date of birth." };
      }
      if (parsed.getTime() > Date.now()) {
        return {
          error: true,
          message: "Date of birth cannot be in the future.",
        };
      }
    }

    // Only these columns are writable here. Role, access status, department and
    // employment type stay under CCRO/system administration — a resident must
    // never be able to change their own privileges from this dialog.
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        middle_name: nullIfBlank(middleName),
        // Giving a middle name withdraws any earlier "I don't have one".
        ...(data.hasNoMiddleName !== undefined
          ? { has_no_middle_name: data.hasNoMiddleName }
          : middleName
            ? { has_no_middle_name: false }
            : {}),
        last_name: lastName,
        suffix: nullIfBlank(data.suffix),
        date_of_birth: nullIfBlank(dateOfBirth),
        sex: nullIfBlank(data.sex),
        phone_number: nullIfBlank(phoneNumber),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      const isJsonEmpty = error.message === "{}" || !error.message;
      return {
        error: true,
        message: isJsonEmpty
          ? "An unexpected error occurred while saving your profile."
          : error.message,
      };
    }

    return { error: false, message: "Profile updated." };
  });

export const changeMyPasswordFn = createServerFn({ method: "POST" })
  .validator((d: { currentPassword: string; newPassword: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession();

    if (!user.email) {
      return {
        error: true,
        message: "This account has no email address on file.",
      };
    }

    const rules = newPasswordSchema.safeParse(data.newPassword);
    if (!rules.success) {
      return { error: true, message: rules.error.issues[0].message };
    }
    if (!passwordHasNumber(data.newPassword)) {
      return { error: true, message: PASSWORD_NUMBER_MESSAGE };
    }

    // The same per-account budget as signing in: a borrowed session must not
    // become a way to guess the account's password.
    if (!(await allowAttempt("sign-in:email", user.email, RATE_LIMITS.signInPerEmail))) {
      return { error: true, message: TOO_MANY_ATTEMPTS };
    }

    // Confirm the current password on a stateless client. Signing in on the
    // cookie-bound client would rewrite the live session; we deliberately do not
    // sign this throwaway client out either, because signOut's default global
    // scope would revoke the session the user is currently browsing with.
    const verifier = getSupabaseStatelessClient();
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: data.currentPassword,
    });

    if (verifyError) {
      return { error: true, message: "Your current password is incorrect." };
    }

    // The new password is set through the session that just proved the old
    // one. With Supabase's "secure password change" on, a session older than a
    // day can't change the password without reauthenticating, and the one the
    // user is browsing with may well be that old.
    const { error } = await verifier.auth.updateUser({
      password: data.newPassword,
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
      return {
        error: true,
        message: isJsonEmpty
          ? "An unexpected error occurred while updating your password."
          : error.message,
      };
    }

    // Whoever else holds a session on this account (a shared office PC, a
    // device that was lost) is signed out. This session stays.
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "others",
    });
    if (signOutError) {
      console.error("Other sessions could not be signed out", signOutError);
    }

    await recordPasswordChanged(user.id);

    return { error: false, message: "Password updated." };
  });

const AVATAR_FILE = /^[A-Za-z0-9_-]+\.(?:jpg|png|webp)$/;

/**
 * Points the profile at a photo the browser has already uploaded to its own
 * folder, then deletes the one it replaces. The upload itself goes straight to
 * storage under the bucket's per-user policies; this is where it becomes the
 * person's photo.
 */
export const setMyAvatarFn = createServerFn({ method: "POST" })
  .validator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession();

    const [folder, file, ...rest] = data.path.split("/");
    if (folder !== user.id || !file || rest.length || !AVATAR_FILE.test(file)) {
      return { error: true, message: "That photo could not be used." };
    }

    // The path must be a file that is really there, not just a plausible name.
    const { data: found, error: lookupError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .list(user.id, { search: file, limit: 10 });
    if (lookupError || !found?.some((entry) => entry.name === file)) {
      return { error: true, message: "The photo did not finish uploading." };
    }

    const { data: current } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .single();
    const previous = current?.avatar_path as string | null | undefined;

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: data.path, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      // The upload is orphaned if it can't be attached, so clean it up.
      await supabase.storage.from(AVATAR_BUCKET).remove([data.path]);
      return {
        error: true,
        message: "An unexpected error occurred while saving your photo.",
      };
    }

    if (previous && previous !== data.path) {
      await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
      forgetAvatarUrl(previous);
    }

    return { error: false, message: "Profile photo updated." };
  });

export const removeMyAvatarFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabase, user } = await requireActiveSession();

    const { data: current } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .single();
    const previous = current?.avatar_path as string | null | undefined;
    if (!previous) return { error: false, message: "Profile photo removed." };

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: null, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) {
      return {
        error: true,
        message: "An unexpected error occurred while removing your photo.",
      };
    }

    await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    forgetAvatarUrl(previous);

    return { error: false, message: "Profile photo removed." };
  },
);
