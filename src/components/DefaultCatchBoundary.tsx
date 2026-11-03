import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { QuietLink as Link } from "~/components/quiet-link";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { RotateCw, TriangleAlert, WifiOff } from "lucide-react";
import { Forbidden } from "~/components/Forbidden";
import {
  ErrorPageLayout,
  StatusDot,
  errorActionClass,
  errorLinkClass,
} from "~/components/errors/ErrorPageLayout";
import { Button } from "~/components/ui/button";
import { useOnlineStatus } from "~/hooks/useOnlineStatus";
import {
  isForbiddenError,
  isNetworkError,
  isUnauthorizedError,
} from "~/lib/access";

/**
 * Root error boundary. Sorts the failure into the page that tells the person
 * what to do about it:
 *
 *  - `Forbidden: …`     → access restricted
 *  - `Unauthorized: …`  → sign in again
 *  - network failure    → you're offline, and we retry when you're back
 *  - anything else      → generic "our side" page with a retry
 *
 * The raw error text is only shown in development; a resident has no use for a
 * stack trace and it can leak internals.
 */
export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const online = useOnlineStatus();
  const forbidden = isForbiddenError(error);
  const unauthorized = isUnauthorizedError(error);
  const offline = !forbidden && !unauthorized && isNetworkError(error);

  // The page failed because the connection dropped; the moment it returns,
  // retry on the person's behalf rather than making them hunt for the button.
  const wasOffline = React.useRef(false);
  React.useEffect(() => {
    if (!offline) return;
    if (!online) {
      wasOffline.current = true;
    } else if (wasOffline.current) {
      wasOffline.current = false;
      reset();
      void router.invalidate();
    }
  }, [offline, online, reset, router]);

  if (forbidden || unauthorized) {
    return <Forbidden signedOut={unauthorized} />;
  }

  const retry = () => {
    reset();
    void router.invalidate();
  };

  if (offline) {
    return (
      <ErrorPageLayout
        tone="neutral"
        icon={WifiOff}
        eyebrow="No internet connection"
        title="You're offline"
        description={
          <>
            <p>
              CiviCheck needs an internet connection to load this page. Check
              your Wi-Fi or mobile data, then try again.
            </p>
            <p
              role="status"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-subtle px-3 py-1 text-[13px] font-medium text-body-strong"
            >
              <StatusDot tone={online ? "info" : "neutral"} pulse={!online} />
              {online
                ? "Connection restored — reloading…"
                : "Waiting for a connection…"}
            </p>
          </>
        }
        actions={
          <Button type="button" className={errorActionClass} onClick={retry}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <ErrorPageLayout
      tone="danger"
      icon={TriangleAlert}
      eyebrow="Something went wrong"
      title="We couldn't load this page"
      announce
      description={
        <>
          <p>
            This is a problem on our side, not something you did. Try again in
            a moment — if it keeps happening, please let the CCRO office know.
          </p>
          {import.meta.env.DEV ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-health-error-border bg-health-error-bg p-3 text-left font-mono text-xs whitespace-pre-wrap text-health-error-fg">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          ) : null}
        </>
      }
      actions={
        <>
          <Link to="/" className={errorLinkClass("outline")}>
            Back to home
          </Link>
          <Button type="button" className={errorActionClass} onClick={retry}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
        </>
      }
    />
  );
}
