import { getRequest } from "@tanstack/react-start/server";

// Production URLs must come from trusted configuration: this URL is used for
// OAuth redirects and invite links carrying tokens. Only local development
// may use a request origin, and only when its hostname is exactly loopback.
export function getAppUrl() {
  return resolveAppUrl().replace(/\/+$/, "");
}

function resolveAppUrl() {
  if (process.env.NODE_ENV === "development") {
    const url = new URL(getRequest().url);
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      // The PKCE verifier is stored on this host. A production APP_URL copied
      // into .env must not send the callback (or Secure cookies) elsewhere.
      return url.origin;
    }
  }

  if (process.env.APP_URL) return process.env.APP_URL;
  if (
    process.env.VERCEL_ENV === "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
  ) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
