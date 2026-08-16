import { createServerFn } from "@tanstack/react-start";
import { requireActiveSession } from "~/server/auth";
import { getSupabaseStatelessClient } from "~/utils/supabase";

type UpdateProfileInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  sex: "" | "male" | "female";
  phoneNumber: string;
};

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
        middle_name: nullIfBlank(data.middleName),
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

    if (data.newPassword.length < 8 || !/\d/.test(data.newPassword)) {
      return {
        error: true,
        message:
          "Your new password must be at least 8 characters and include a number.",
      };
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

    const { error } = await supabase.auth.updateUser({
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

    return { error: false, message: "Password updated." };
  });
