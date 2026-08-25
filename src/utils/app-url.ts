import { getRequest } from "@tanstack/react-start/server";

// Derives the origin from the request instead of APP_URL/VERCEL_URL so it's correct in dev, previews, and production without manual syncing.
export function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  const request = getRequest();
  return new URL(request.url).origin;
}
