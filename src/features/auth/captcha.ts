export const CAPTCHA_ACTION = "authentication";

export const CAPTCHA_REQUIRED_MESSAGE = "Please complete the security verification to continue.";
export const CAPTCHA_RETRY_MESSAGE = "Verification expired or failed. Please verify again.";
export const CAPTCHA_UNAVAILABLE_MESSAGE = "Security verification is temporarily unavailable. Please try again shortly.";

export function captchaFailure(message = CAPTCHA_REQUIRED_MESSAGE) {
  return { error: true as const, captchaRequired: true, captchaError: true, message };
}
