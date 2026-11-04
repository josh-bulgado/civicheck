import type { useInvisibleCaptcha } from "../hooks/useInvisibleCaptcha";
import { QuietAnchor } from "~/components/quiet-link";
import "../invisible-captcha.css";

export function RecaptchaNotice() {
  return <p className="recaptcha-notice">
    This site is protected by reCAPTCHA and the Google{" "}
    <QuietAnchor href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</QuietAnchor> and{" "}
    <QuietAnchor href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</QuietAnchor> apply.
  </p>;
}

export function InvisibleCaptcha({ captcha }: { captcha: ReturnType<typeof useInvisibleCaptcha> }) {
  return <>
    <div ref={captcha.container} className="invisible-recaptcha" data-size="invisible" />
    {captcha.error && <div role="alert" className="text-center text-sm text-destructive">
      <p>{captcha.error}</p>
      {!captcha.busy && <button type="button" onClick={captcha.retry} className="underline underline-offset-4">Retry verification</button>}
    </div>}
  </>;
}
