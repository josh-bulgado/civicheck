import { describe, expect, it } from "vitest";
import { getSignupErrorField } from "./signup-error";

describe("signup field errors", () => {
  it.each(["email_exists", "user_already_exists", "email_address_invalid"])(
    "links %s to the email field even if the provider changes its wording",
    (code) => {
      expect(
        getSignupErrorField({ code, message: "A translated message" }),
      ).toBe("email");
    },
  );

  it("supports the duplicate-email message from older responses", () => {
    expect(
      getSignupErrorField({
        message: "A user with this email address has already been registered",
      }),
    ).toBe("email");
  });

  it("links server-side password rejection to the password field", () => {
    expect(getSignupErrorField({ code: "weak_password" })).toBe("password");
  });

  it.each([
    { code: "over_email_send_rate_limit", message: "Too many emails" },
    {
      code: "email_address_not_authorized",
      message: "Email sending is not allowed",
    },
    {
      code: "unexpected_failure",
      message: "An email address already exists in another system",
    },
    { message: "Failed to send the email verification code" },
    { message: "Check your connection and try again" },
  ])("does not blame a field for a service failure: $message", (error) => {
    expect(getSignupErrorField(error)).toBeUndefined();
  });
});
