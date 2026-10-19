import * as React from "react";
import { useRouter } from "@tanstack/react-router";
import { Check, WifiOff } from "lucide-react";
import { useOnlineStatus } from "~/hooks/useOnlineStatus";
import { cn } from "~/lib/utils";

const RESTORED_VISIBLE_MS = 3000;

/**
 * Floating connection notice, mounted once in the root document so it follows
 * the person across every screen.
 *
 * Offline: a persistent pill — nothing the page does will work until the
 * connection returns, so it stays put. Reconnected: a short "back online"
 * confirmation, and the router re-runs its loaders so any screen that was
 * showing stale or failed data refreshes without a manual reload.
 *
 * This is not an offline mode — nothing is cached or queued. It only says
 * plainly why the page has stopped responding.
 */
export function OfflineBanner() {
  const router = useRouter();
  const online = useOnlineStatus();
  const [phase, setPhase] = React.useState<"hidden" | "offline" | "restored">(
    "hidden",
  );
  const wasOffline = React.useRef(false);

  React.useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setPhase("offline");
      return;
    }
    if (!wasOffline.current) return;

    wasOffline.current = false;
    setPhase("restored");
    void router.invalidate();
    const timer = window.setTimeout(
      () => setPhase("hidden"),
      RESTORED_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [online, router]);

  if (phase === "hidden") return null;

  const isOffline = phase === "offline";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
      <p
        role="status"
        aria-live="polite"
        className={cn(
          "civic-enter-scale pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full border py-2 pr-4 pl-3 text-[13.5px] font-medium shadow-lg",
          isOffline
            ? "border-panel-dark-divider bg-panel-dark text-white"
            : "border-health-success-border bg-health-success-bg text-health-success-fg",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            isOffline
              ? "bg-brand-gold text-panel-dark"
              : "bg-health-success-dot text-white dark:text-background",
          )}
        >
          {isOffline ? (
            <WifiOff className="size-3.5" strokeWidth={2.25} />
          ) : (
            <Check className="size-3.5" strokeWidth={2.5} />
          )}
        </span>
        <span className="min-w-0">
          {isOffline ? (
            <>
              <span className="font-semibold">You&apos;re offline.</span>{" "}
              <span className="text-panel-dark-text">
                Check your connection — we&apos;ll reconnect automatically.
              </span>
            </>
          ) : (
            "Back online"
          )}
        </span>
      </p>
    </div>
  );
}
