import { useCallback, useState } from "react";
import { CAPTCHA_REQUIRED_MESSAGE, CAPTCHA_RETRY_MESSAGE } from "../captcha";

type CaptchaResult = { error?: boolean; captchaRequired?: boolean; captchaError?: boolean; message?: string } | undefined;

export function useCaptcha(alwaysRequired = false) {
  const [required, setRequired] = useState(alwaysRequired);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const onToken = useCallback((value: string | null) => {
    setToken(value);
    // Widget lifecycle errors are shown by Captcha; starting a fresh attempt
    // also clears any previous server error while keeping the token empty.
    setError(null);
  }, []);

  function requireVerification() {
    setRequired(true);
    setError(CAPTCHA_REQUIRED_MESSAGE);
  }

  function recordResult(result: CaptchaResult) {
    // Every submitted token is single-use, including a failed credential check.
    setToken(null);
    setResetKey(value => value + 1);
    if (result?.captchaRequired) setRequired(true);
    setError(result?.captchaError ? result.message ?? CAPTCHA_RETRY_MESSAGE : null);
  }

  return { required, token, error, resetKey, onToken, requireVerification, recordResult };
}
