import { useEffect, useId, useRef, useState } from "react";
import {
  CAPTCHA_LOAD_MESSAGE, CAPTCHA_RETRY_MESSAGE, CAPTCHA_UNAVAILABLE_MESSAGE,
} from "../captcha";
import { getCaptchaConfigFn } from "../captcha.functions";

export type RecaptchaApi = {
  render: (container: HTMLElement, options: {
    sitekey: string; theme: "light"; size: "compact" | "normal" | "invisible";
    callback: (token: string) => void;
    "expired-callback": () => void; "error-callback": () => void;
  }) => number;
  reset: (id: number) => void;
  execute: (id: number) => void;
};
type RecaptchaWindow = Window & {
  grecaptcha?: RecaptchaApi;
  civicheckRecaptchaLoaded?: () => void;
};
let scriptPromise: Promise<RecaptchaApi> | null = null;

export function loadRecaptcha(): Promise<RecaptchaApi> {
  const browser = window as RecaptchaWindow;
  if (browser.grecaptcha?.render) return Promise.resolve(browser.grecaptcha);
  scriptPromise ??= new Promise<RecaptchaApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?onload=civicheckRecaptchaLoaded&render=explicit";
    script.async = true;
    script.defer = true;
    let settled = false;
    const timer = window.setTimeout(fail, 15000);
    function fail() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      delete browser.civicheckRecaptchaLoaded;
      script.remove();
      reject(new Error("Security verification could not load"));
    }
    // Google's onload callback fires after its dependencies are ready to render.
    browser.civicheckRecaptchaLoaded = () => {
      if (settled) return;
      if (!browser.grecaptcha?.render) { fail(); return; }
      settled = true;
      window.clearTimeout(timer);
      delete browser.civicheckRecaptchaLoaded;
      resolve(browser.grecaptcha);
    };
    script.addEventListener("error", fail, { once: true });
    document.head.append(script);
  }).catch(error => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

export function Captcha({ onToken, error, resetKey }: {
  onToken: (token: string | null) => void;
  error: string | null;
  resetKey: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const errorId = useId();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let widget: { api: RecaptchaApi; id: number; host: HTMLDivElement } | undefined;
    setLoadError(null);
    setRendered(false);
    async function render() {
      try {
        const config = await getCaptchaConfigFn();
        if (!active) return;
        if (!config.siteKey) {
          onToken(null);
          setLoadError(config.error ?? CAPTCHA_UNAVAILABLE_MESSAGE);
          return;
        }
        const api = await loadRecaptcha();
        if (!active || !container.current) return;
        const host = document.createElement("div");
        container.current.append(host);
        const fail = (message: string) => {
          if (!active) return;
          onToken(null);
          setLoadError(message);
        };
        try {
          const id = api.render(host, {
            sitekey: config.siteKey, theme: "light",
            size: container.current.clientWidth < 304 ? "compact" : "normal",
            callback: token => {
              if (!active) return;
              setLoadError(null);
              onToken(token);
            },
            "expired-callback": () => fail(CAPTCHA_RETRY_MESSAGE),
            "error-callback": () => fail(CAPTCHA_LOAD_MESSAGE),
          });
          widget = { api, id, host };
          setRendered(true);
        } catch (error) {
          host.remove();
          throw error;
        }
      } catch {
        if (active) {
          onToken(null);
          setLoadError(CAPTCHA_LOAD_MESSAGE);
        }
      }
    }
    void render();
    return () => {
      active = false;
      if (widget) {
        // Reset before removing Google's iframe to close any open challenge.
        try { widget.api.reset(widget.id); }
        finally { widget.host.remove(); }
      }
    };
  }, [onToken, resetKey, retry]);

  const message = loadError ?? error;
  return (
    <div role="group" aria-label="Security verification" aria-describedby={message ? errorId : undefined}
      className="grid w-full min-w-0 justify-items-center gap-2 py-1">
      <div ref={container} className="flex w-full min-w-0 justify-center" />
      {!rendered && !loadError && <p role="status" className="text-sm text-muted-foreground">Loading security verification…</p>}
      {message && <p id={errorId} role="alert" className="text-center text-sm text-destructive">{message}</p>}
      {message && <button type="button" className="text-sm underline underline-offset-4"
        onClick={() => {
          onToken(null);
          setRetry(value => value + 1);
        }}>Retry verification</button>}
    </div>
  );
}
