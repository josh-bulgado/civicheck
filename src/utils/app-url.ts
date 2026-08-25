// Never derive this from the request's Host header — it's client-controlled
// and this URL is used for OAuth redirects and invite links carrying tokens.
export function getAppUrl() {
  return resolveAppUrl().replace(/\/+$/, "");
}

function resolveAppUrl() {
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
