// Bound untrusted input without truncating the longer tokens reCAPTCHA can issue.
export const CAPTCHA_TOKEN_MAX_LENGTH = 8192;
export const INVISIBLE_CAPTCHA_FAILURE_MESSAGE = "We couldn't verify you're human. Please try again.";

export const CAPTCHA_REQUIRED_MESSAGE = "Please complete the security verification to continue.";
export const CAPTCHA_RETRY_MESSAGE = "Verification expired or failed. Please verify again.";
export const CAPTCHA_UNAVAILABLE_MESSAGE = "Security verification is temporarily unavailable. Please try again shortly.";
export const CAPTCHA_LOAD_MESSAGE = "Security verification could not load. Check your connection or try another browser.";
export const CAPTCHA_CONFIG_MESSAGE = "Security verification is not configured for this website. Please contact support.";

export function captchaFailure(message = CAPTCHA_REQUIRED_MESSAGE) {
  return { error: true as const, captchaRequired: true, captchaError: true, message };
}
