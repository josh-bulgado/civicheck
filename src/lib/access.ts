import { redirect } from "@tanstack/react-router";

/**
 * Server functions and middleware reject with `Forbidden: …` / `Unauthorized: …`
 * messages (see `src/middleware/auth.ts`). Matching on the message prefix, not
 * `instanceof`, because errors that cross the SSR boundary are rebuilt on the
 * client and lose their original class.
 */
function messageOf(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message: unknown };
    return typeof message === "string" ? message : "";
  }
  return "";
}

/** The signed-in account is not allowed to see this. */
export function isForbiddenError(error: unknown): boolean {
  return /^forbidden\b/i.test(messageOf(error));
}

/** There is no usable session — the user needs to sign in again. */
export function isUnauthorizedError(error: unknown): boolean {
  return /^unauthorized\b/i.test(messageOf(error));
}

/**
 * The request never reached the server. `navigator.onLine === false` is a
 * reliable "offline"; the message check covers a flaky connection that the
 * browser still reports as online.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(
    messageOf(error),
  );
}

/**
 * Route guard for "signed in, but your role can't open this".
 *
 * Sends the user to the `/forbidden` page rather than silently bouncing them to
 * the dashboard, and `replace`s the history entry so the Back button returns to
 * where they came from instead of looping through the guarded URL.
 */
export function denyAccess(location: { pathname: string }): never {
  throw redirect({
    to: "/forbidden",
    search: { from: location.pathname },
    replace: true,
  });
}
