import { useEffect, useId, useRef, useState } from "react";
import { CAPTCHA_ACTION, CAPTCHA_UNAVAILABLE_MESSAGE } from "../captcha";
import { getCaptchaConfigFn } from "../captcha.functions";

type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string; action: string; theme: "auto"; size: "compact" | "flexible";
    "response-field": boolean; callback: (token: string) => void;
    "expired-callback": () => void; "error-callback": () => void;
    "timeout-callback": () => void;
  }) => string;
  remove: (id: string) => void;
};
type TurnstileWindow = Window & { turnstile?: TurnstileApi };
let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  const browser = window as TurnstileWindow;
  if (browser.turnstile) return Promise.resolve(browser.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timer = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("Security verification could not load"));
    }
    script.addEventListener("error", fail, { once: true });
    script.addEventListener("load", () => {
      window.clearTimeout(timer);
      if (browser.turnstile) resolve(browser.turnstile);
      else fail();
    }, { once: true });
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
    let widget: { api: TurnstileApi; id: string } | undefined;
    setLoadError(null);
    setRendered(false);
    async function render() {
      try {
        const config = await getCaptchaConfigFn();
        if (!config.siteKey) throw new Error(config.error ?? CAPTCHA_UNAVAILABLE_MESSAGE);
        const api = await loadTurnstile();
        if (!active || !container.current) return;
        const invalidate = () => { if (active) onToken(null); };
        const id = api.render(container.current, {
          sitekey: config.siteKey, action: CAPTCHA_ACTION, theme: "auto",
          size: container.current.clientWidth < 300 ? "compact" : "flexible",
          "response-field": false,
          callback: token => { if (active) onToken(token); },
          "expired-callback": invalidate, "error-callback": invalidate,
          "timeout-callback": invalidate,
        });
        widget = { api, id };
        setRendered(true);
      } catch {
        if (active) setLoadError(CAPTCHA_UNAVAILABLE_MESSAGE);
      }
    }
    void render();
    return () => {
      active = false;
      if (widget) widget.api.remove(widget.id);
    };
  }, [onToken, resetKey, retry]);

  const message = loadError ?? error;
  return (
    <div role="group" aria-label="Security verification" aria-describedby={message ? errorId : undefined}
      className="grid w-full min-w-0 justify-items-center gap-2 py-1">
      <div ref={container} className="w-full min-w-0" />
      {!rendered && !loadError && <p role="status" className="text-sm text-muted-foreground">Loading security verification…</p>}
      {message && <p id={errorId} role="alert" className="text-center text-sm text-destructive">{message}</p>}
      {loadError && <button type="button" className="text-sm underline underline-offset-4"
        onClick={() => setRetry(value => value + 1)}>Retry verification</button>}
    </div>
  );
}
