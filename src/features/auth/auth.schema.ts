import { z } from "zod";
import { NO_SUFFIX, SUFFIXES } from "~/lib/subject-fields";

// Rules shared by the auth forms and the server functions behind them. The
// forms use them for instant feedback; the server functions use them because a
// request can be sent without going through a form at all, so nothing the
// client checked can be assumed.

const EMAIL_MAX = 254;
const NAME_MAX = 120;
const PASSWORD_MIN = 8;
// bcrypt ignores everything past 72 bytes, so a longer password would be
// silently truncated and two different passwords could match. Measured in
// bytes: a multi-byte character costs more than one.
const PASSWORD_MAX_BYTES = 72;
const LOGIN_PASSWORD_MAX = 256;
const OTP_MIN = 6;
const OTP_MAX = 12;

const SUFFIX_VALUES: string[] = SUFFIXES.filter(
  (suffix) => suffix.value !== NO_SUFFIX,
).map((suffix) => suffix.value);

const hasNoControlCharacters = (value: string) => !/\p{Cc}/u.test(value);

export const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .max(EMAIL_MAX, "Email address is too long");

/** A password being chosen: long enough, and short enough not to be truncated. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
    `Password is too long. Use ${PASSWORD_MAX_BYTES} characters or fewer`,
  );

/**
 * A password being entered to sign in. Only bounded, never held to the creation
 * rules, so an account made under an older policy can still get in.
 */
export const loginPasswordSchema = z
  .string()
  .min(1, "Password is required")
  .max(LOGIN_PASSWORD_MAX, "Password is too long");

const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(NAME_MAX, `${label} is too long`)
    .refine(hasNoControlCharacters, `${label} contains invalid characters`);

/** The account-holder fields collected at signup. */
export const signupInputSchema = z.object({
  firstName: personName("First name"),
  lastName: personName("Last name"),
  // Optional: this names the account holder, not the registry record. The
  // names that must match a record are entered per request in the apply flow.
  middleName: z
    .string()
    .trim()
    .max(NAME_MAX, "Middle name is too long")
    .refine(hasNoControlCharacters, "Middle name contains invalid characters"),
  // The form only offers the shared list, so the server accepts nothing else.
  suffix: z
    .string()
    .refine(
      (value) => value === "" || SUFFIX_VALUES.includes(value),
      "Choose a suffix from the list",
    ),
  email: emailSchema,
  password: newPasswordSchema.refine(
    (value) => /\d/.test(value),
    "Password must include at least one number",
  ),
});

export const credentialsSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
});

export const oauthProviderSchema = z.object({
  provider: z.enum(["google", "apple"]),
});

export const otpVerificationSchema = z.object({
  email: emailSchema,
  // Length is a project-level Supabase setting, so only bound it.
  token: z.string().trim().min(OTP_MIN).max(OTP_MAX),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const newPasswordInputSchema = z.object({ password: newPasswordSchema });
