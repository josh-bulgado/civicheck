import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTCHA_LOAD_MESSAGE, CAPTCHA_RETRY_MESSAGE } from "../captcha";
import { getInvisibleCaptchaConfigFn } from "../captcha.functions";
import { loadRecaptcha, type RecaptchaApi } from "../components/Captcha";

/** Executes only after form validation; only Google's callback can submit. */
export function useInvisibleCaptcha() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: RecaptchaApi; id: number } | null>(null);
  const pending = useRef<{
    submit: (token: string) => Promise<void>; resolve: () => void;
    timer: ReturnType<typeof setTimeout>; submitting: boolean;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const finish = useCallback(() => {
    const request = pending.current;
    pending.current = null;
    if (request) { clearTimeout(request.timer); request.resolve(); }
    try { if (widget.current) widget.current.api.reset(widget.current.id); }
    catch { /* The widget can already be gone during navigation. */ }
    setBusy(false);
  }, []);

  useEffect(() => {
    let active = true;
    let host: HTMLDivElement | undefined;
    setReady(false);
    setError(null);
    void (async () => {
      try {
        const config = await getInvisibleCaptchaConfigFn();
        if (!active) return;
        if (!config.siteKey) { setError(config.error); return; }
        const api = await loadRecaptcha();
        if (!active || !container.current) return;
        host = document.createElement("div");
        host.dataset.size = "invisible";
        container.current.append(host);
        const fail = (message: string) => {
          if (!active || pending.current?.submitting) return;
          setError(message);
          finish();
        };
        const id = api.render(host, {
          sitekey: config.siteKey, theme: "light", size: "invisible",
          callback: token => {
            const request = pending.current;
            if (!active || !request || request.submitting) return;
            if (!token) { fail(CAPTCHA_RETRY_MESSAGE); return; }
            request.submitting = true;
            clearTimeout(request.timer);
            void request.submit(token).catch(() => {
              if (active) setError("The request failed. Please try again.");
            }).finally(() => { if (active) finish(); });
          },
          "expired-callback": () => fail(CAPTCHA_RETRY_MESSAGE),
          "error-callback": () => fail(CAPTCHA_LOAD_MESSAGE),
        });
        widget.current = { api, id };
        setReady(true);
      } catch {
        if (active) setError(CAPTCHA_LOAD_MESSAGE);
      }
    })();
    return () => {
      active = false;
      finish();
      widget.current = null;
      host?.remove();
    };
  }, [finish, revision]);

  function execute(submit: (token: string) => Promise<void>): Promise<void> {
    if (pending.current) return Promise.resolve();
    const current = widget.current;
    if (!current) { setError(CAPTCHA_LOAD_MESSAGE); return Promise.resolve(); }
    setError(null);
    setBusy(true);
    return new Promise(resolve => {
      pending.current = { submit, resolve, submitting: false, timer: setTimeout(() => {
        setError(CAPTCHA_RETRY_MESSAGE);
        finish();
      }, 120000) };
      try { current.api.execute(current.id); }
      catch { setError(CAPTCHA_LOAD_MESSAGE); finish(); }
    });
  }

  return { container, ready, busy, error, execute, retry: () => setRevision(value => value + 1) };
}
