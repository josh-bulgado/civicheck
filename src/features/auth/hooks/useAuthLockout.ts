import { useEffect, useState } from "react";

type AttemptResult = { error?: boolean; lockedUntil?: number } | undefined;

/** The server owns the deadline; this timer only keeps the form in sync. */
export function useAuthLockout(initialDeadline?: number) {
  const [deadline, setDeadline] = useState<number | null>(initialDeadline ?? null);
  const [now, setNow] = useState(() => Date.now());
  const secondsRemaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= deadline) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  function recordResult(result: AttemptResult) {
    setNow(Date.now());
    setDeadline(result?.lockedUntil ?? null);
  }

  return {
    recordResult,
    isLocked: secondsRemaining > 0,
    hasExpired: deadline !== null && secondsRemaining === 0,
    message: secondsRemaining > 0
      ? `Too many attempts. Please try again in ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}.`
      : null,
  };
}
