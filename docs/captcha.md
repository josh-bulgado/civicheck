# CAPTCHA configuration

CiviCheck verifies Cloudflare Turnstile tokens in its server handlers. Signup
and Google authentication always require verification. Password login requires
it after two attempts within the existing 15-minute window. Five unsuccessful
password submissions still lock the account. Solving CAPTCHA does not reset
the attempt counter. Missing or invalid CAPTCHA does not spend an account's
password attempt allowance.

## Production and preview setup

1. Create a **Managed** widget in Cloudflare Turnstile. Add the application's
   production and preview hostnames to the widget's allowed hostnames.
2. Configure these environment variables in the deployment environment:

   | Variable | Value |
   | --- | --- |
   | `TURNSTILE_SITE_KEY` | Public site key from the widget |
   | `TURNSTILE_SECRET_KEY` | Private secret key, available only to the server |
   | `TURNSTILE_ALLOWED_HOSTNAMES` | Optional comma-separated hostnames, with no scheme or path; defaults to the trusted application URL's hostname |

3. Redeploy or restart the application after setting the variables.

The public site key is fetched from the app server. The secret key is never
returned to the browser. Missing configuration, invalid metadata, expired or
replayed tokens, and verification service failures reject the protected action.
Public deployments reject Cloudflare's dummy keys.

The app performs its own verification to support conditional login challenges
and the Supabase admin signup flow. No Supabase CAPTCHA dashboard setting or
database migration is needed for this integration.

## Local development

On `localhost`, `127.0.0.1`, or `[::1]`, a non-production process outside Vercel
uses Cloudflare's official passing test keys when both variables are empty.
Those tokens still go through Cloudflare's Siteverify endpoint. Explicit keys
can be set in the ignored local environment file. Never commit secret values.

If `.env` already contains production keys, set both key variables to empty in
the ignored `.env.development.local` file to use the local test keys. This keeps
the real keys in `.env` available for production without using them on localhost.
Restart the development server after changing environment files.

The development widget uses dummy tokens, so production metadata checks and
replay rejection are covered separately by automated tests. Real tokens must
match the configured hostname and `authentication` action.

Google authentication carries a signed, HttpOnly proof across the provider
redirect. The callback consumes the proof once through the existing atomic
database limiter, then checks the verified account's cooldown before publishing
session cookies.

References: [Cloudflare server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/),
[Cloudflare test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
