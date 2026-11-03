import {
  createCsrfMiddleware,
  createMiddleware,
  createStart,
} from "@tanstack/react-start";

// Declaring a start instance replaces the framework's default request
// middleware, which is where server functions get their CSRF check, so that
// check has to be listed here or every server function loses it.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/** Headers every response carries unless a handler already set its own. */
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  // Auth callback URLs carry single-use tokens; a full URL never leaves the site.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Document capture and the cashier's QR scanner use the camera; nothing else does.
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
};

/** A fresh value per response; base64 is what CSP expects in a nonce source. */
function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** Supabase serves the API, storage links and the realtime socket. */
function supabaseSources() {
  try {
    const url = new URL(process.env.SUPABASE_URL ?? "");
    return { https: url.origin, wss: `wss://${url.host}` };
  } catch {
    return null;
  }
}

/**
 * The page may run only its own scripts and those carrying this response's
 * nonce (the router stamps it on the hydration and theme scripts), so injected
 * markup can't execute, and may talk only to itself and Supabase, so a script
 * that does run can't send a session anywhere else.
 *
 * `wasm-unsafe-eval` lets pdf.js and the PDF layout engine compile their
 * WebAssembly; it does not allow eval of JavaScript. Styles stay inline-capable
 * because React renders `style` attributes and the chart component writes a
 * <style> tag; a nonce there would make browsers ignore 'unsafe-inline'.
 */
function contentSecurityPolicy(nonce: string) {
  const supabase = supabaseSources();
  // Vercel injects its feedback toolbar into preview deployments only.
  const vercelPreview = process.env.VERCEL_ENV === "preview";
  const sources = (...values: Array<string | false | undefined>) =>
    values.filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    `script-src ${sources("'self'", `'nonce-${nonce}'`, "'wasm-unsafe-eval'", vercelPreview && "https://vercel.live")}`,
    `style-src ${sources("'self'", "'unsafe-inline'", vercelPreview && "https://vercel.live")}`,
    `img-src ${sources("'self'", "data:", "blob:", supabase?.https, vercelPreview && "https://vercel.live https://vercel.com")}`,
    `font-src ${sources("'self'", "data:", vercelPreview && "https://vercel.live https://assets.vercel.com")}`,
    `connect-src ${sources("'self'", supabase?.https, supabase?.wss, vercelPreview && "https://vercel.live wss://ws-us3.pusher.com")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    `frame-src ${sources("'self'", "blob:", vercelPreview && "https://vercel.live")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

function withHeaders(response: Response, extra: Record<string, string>): Response {
  const missing = Object.entries({ ...SECURITY_HEADERS, ...extra }).filter(
    ([name]) => !response.headers.has(name),
  );
  try {
    for (const [name, value] of missing) response.headers.set(name, value);
    return response;
  } catch {
    // Some responses (Response.redirect, for one) have read-only headers.
    const headers = new Headers(response.headers);
    for (const [name, value] of missing) headers.set(name, value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  // The dev server injects its own unnonced scripts (HMR, React Refresh), so
  // the full policy only applies to production builds.
  if (process.env.NODE_ENV !== "production") {
    const result = await next();
    return {
      ...result,
      response: withHeaders(result.response, {
        "Content-Security-Policy": "frame-ancestors 'self'",
      }),
    };
  }

  const cspNonce = createNonce();
  // getRouter() reads this back to stamp the nonce on the scripts it renders.
  const result = await next({ context: { cspNonce } });
  return {
    ...result,
    response: withHeaders(result.response, {
      "Content-Security-Policy": contentSecurityPolicy(cspNonce),
    }),
  };
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, securityHeadersMiddleware],
}));
