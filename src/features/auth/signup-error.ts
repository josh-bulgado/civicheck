export type SignupErrorField = "email" | "password";

/** Only errors a resident can correct in a field should mark that field invalid. */
export function getSignupErrorField(error: {
  code?: string;
  message?: string;
}): SignupErrorField | undefined {
  switch (error.code) {
    case "email_exists":
    case "user_already_exists":
    case "email_address_invalid":
      return "email";
    case "weak_password":
      return "password";
  }

  // Older Auth responses may omit a code. Keep their duplicate-email response
  // actionable without treating email delivery or rate-limit errors as typos.
  if (
    !error.code &&
    /(?:email address|user with this email).*(?:already been registered|already exists)/i.test(
      error.message ?? "",
    )
  ) {
    return "email";
  }
}
