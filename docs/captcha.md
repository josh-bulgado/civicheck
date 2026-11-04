# Authentication CAPTCHA and abuse protection

CiviCheck uses **TanStack Start + React/Vite**, deployed through **Nitro on
Vercel**, with **Supabase Auth/Postgres** and **Resend** email delivery.
Authentication mutations are TanStack server functions, not Next.js API routes.

## CAPTCHA behavior

- Signup keeps its existing **reCAPTCHA v2 Checkbox** keys and visible widget.
- Password login and password recovery (including **Resend**) use a separate
  **reCAPTCHA v2 Invisible** key pair. Email/password validation runs before
  `grecaptcha.execute()`. Only Google's callback submits a token under
  `g-recaptcha-response`; retries always reset the widget and obtain a new token.
- The login **Continue with Google** button does not execute or require CAPTCHA.
  Signup's Google entry point retains its checkbox requirement.
- Invisible badges use `visibility: hidden`. The linked Google Privacy Policy
  and Terms of Service notice appears under the action button in both themes.

The existing server verification helper accepts separate settings for invisible
CAPTCHA. It POSTs to Google's Siteverify endpoint before password authentication
or recovery work. Missing tokens, non-boolean success, unknown hostnames,
score-based responses, quota errors, malformed JSON and network failures are
rejected. An AbortController bounds invisible verification, including reading
its response body, to **four seconds**. Google enforces single use and a
**two-minute** token lifetime. Signup retains its existing timeout and policy.

## Deployment setup

1. Keep the existing **v2 Checkbox** registration and its deployed keys.
2. Create a separate **v2 Invisible** registration in Google's reCAPTCHA console.
   Keep Google's domain verification enabled. Authorize the production domain
   and each intended preview hostname; do not authorize the shared `vercel.app`
   domain or use a v3/score key. Use the legacy Siteverify secret if the key was
   created through Google Cloud.
3. Add the following variables in **Vercel Project Settings > Environment
   Variables** for **Production and Preview**. Put local values in your ignored
   `.env` file. No environment template or real credentials are committed.

   | Variable | Purpose |
   | --- | --- |
   | `RECAPTCHA_SITE_KEY` | Existing public signup Checkbox key |
   | `RECAPTCHA_SECRET_KEY` | Existing private signup secret |
   | `RECAPTCHA_INVISIBLE_SITE_KEY` | New public v2 Invisible key |
   | `RECAPTCHA_INVISIBLE_SECRET_KEY` | New private v2 Invisible secret |
   | `RECAPTCHA_ALLOWED_HOSTNAMES` | Required comma-separated exact production/preview hostnames, without schemes, paths or wildcards |
   | `SUPABASE_URL` | Existing project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | Existing publishable key |
   | `SUPABASE_SECRET_KEY` | Existing server-only service credential; also keys identifier hashes |
   | `APP_URL` | Trusted application URL for this deployment |
   | `RESEND_API_KEY` | Existing email credential |
   | `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO` | Existing verified sender/reply configuration |

   No new Redis variables are needed. Only public site keys are returned by
   server functions. Never add a public/VITE prefix to secret keys.
4. Apply `supabase/migrations/20261104151609_harden_login_and_recovery.sql` to
   every database used by these deployments **before deploying the app**. It
   extends the existing `rate_limit_hits` table and adds service-role-only RPCs.
   Also apply `supabase/migrations/20261104162416_harden_recovery_codes.sql`.
   It adds the private hashed-code/reset-grant store and atomic recovery limits.
   Signup's tables and code lifetime are unchanged. Both migrations must exist
   in Production and in every Preview database before deploying this version.
   Login and recovery fail closed if their migration or shared database is unavailable.
   Recovery codes issued before this deployment must be requested again; new
   code verification does not accept the old one-hour Supabase recovery codes.
5. **Redeploy Production and Preview** after changing environment variables;
   changing dashboard values does not update an existing deployment.
6. Smoke-test a real invisible challenge, an expired/replayed token, a failed
   password retry, recovery and resend, and Google sign-in on the deployed host.
   Real keys, Google client ID configuration and email delivery require this
   deployed check; local tests mock external services.
7. Sign out and back in after deploying so existing browser cookies are
   replaced with the new HttpOnly policy. New sign-ins and server refreshes
   enforce the hardened flags automatically.

## Shared limits and timing

The existing Postgres limiter is reused. Its HMAC bucket keys do not store clear
email addresses or IPs. New reserve/finish RPCs acquire sorted transaction-level
advisory locks across all affected buckets. A reservation counts while Supabase
checks a password, preventing concurrent requests from exceeding the allowance.
Only failed checks persist; successful checks clear the account/IP failures and
release their own IP reservation. Abandoned reservations expire after 60 seconds.

| Scope | Rule |
| --- | --- |
| Account + client IP | Existing five failures per 15-minute window/cooldown |
| Client IP across accounts | 20 failed logins per 15 minutes |
| Account across IPs | 30 failures per rolling hour triggers one owner notification per hour and a 500 ms delay on later attempts; it never hard-locks the account |
| Reset email | Three requests per email per hour, a 60-second resend cooldown, and ten per IP per hour; admitted requests count identically for existing/missing accounts |
| Recovery code guesses | Five wrong guesses per code, then invalidate it; 30 verification calls per IP per 15 minutes; storage failures reject verification |

Every password attempt requires a freshly verified CAPTCHA. Failures from other
IPs never consume the owner's account/IP allowance. A successful login is not
rejected because the account-wide signal is elevated. Unknown IPs share an
`unknown` bucket for login/recovery rather than bypassing limits.

Wrong email and wrong password both return **Invalid email or password**.
Supabase owns the real password hashes. A private RPC returns only whether dummy
work is needed and the bcrypt cost of the project's latest password credential;
missing/passwordless accounts perform a dummy bcrypt comparison at that cost
before taking the same Supabase Auth request path. No password hash leaves the
database. The initial fallback is Supabase's bcrypt cost 10. This assumes the
project's existing Supabase bcrypt credentials; imported alternate hash
algorithms or mixed work factors need a matching timing strategy before use.
The app does not claim constant wall-clock response times across network calls.

Recovery codes use Node's cryptographically secure `randomInt()` to produce
**eight digits**. Only a keyed HMAC of each code is stored in the private
`password_recovery_challenges` table. Codes expire after **ten minutes**. A new
admitted request replaces the previous code and any prior reset authorization.
The server compares fixed-length digests with `timingSafeEqual()`, then commits
the outcome through an atomic SQL RPC. Five wrong guesses erase the code hash;
concurrent requests cannot exceed that limit or consume a correct code twice.
Attempts left are not exposed. The verification step has no CAPTCHA.

A correct code creates a **ten-minute, single-use HttpOnly reset authorization**,
not a general login session. It is consumed atomically before the password
update through Supabase Admin. A failed password update requires a fresh code.
After the password changes, the existing `revoke_user_sessions()` RPC deletes
all refresh sessions and advances the profile revocation marker, so the app
rejects already-issued tokens. Current browser credentials are cleared and a
"Your CiviCheck password was changed" email is scheduled. Supabase access JWTs
remain cryptographically valid until expiry at direct provider APIs; the app's
existing revocation check is what rejects them immediately on app requests.

Account lookup and email delivery run under `waitUntil()` from
`@vercel/functions`. Existing and missing addresses receive exactly
**"If that email exists, we sent a reset code"** and the same code-entry UI;
throttled sends use that confirmation too. The response includes a resend
countdown (at least 60 seconds; longer when the hourly limit is reached). Security notifications use the same lifecycle helper and a
trusted confirmed email read from Auth. Background failures log a generic
message. Local non-Vercel execution awaits background work so it cannot become
an orphaned promise. No local memory stores counters, lockouts or reset codes.
Nitro's shared Vercel function has `maxDuration: 60`; Google, database/Auth and
email HTTP requests have bounded timeouts. `waitUntil` is bounded background
work, not a durable retry queue.


## Session cookies and browser services

Auth and persistence cookies are **HttpOnly**, **SameSite=Lax**, and **Secure**
in production/on Vercel (and on local HTTPS). The existing "Keep me signed in" choice only changes cookie
lifetime. Plain HTTP loopback development does not require Secure cookies.
PKCE verifier cookies are also HttpOnly; the server performs the code exchange.

Realtime and direct avatar uploads no longer read or write browser auth cookies.
The browser Supabase client uses its `accessToken` callback to call a server
function which validates the active, non-revoked session and returns only an
access token with `Cache-Control: private, no-store`. Refresh tokens remain in
HttpOnly cookies and are refreshed on the server. The callback is also used by
Realtime for token renewal. This keeps existing Realtime/Storage behavior with
the stronger cookie settings; no new dependency is required.

The existing CSP already permits Google's documented recaptcha script, frame,
and connection origins. Badge hiding is scoped to `.grecaptcha-badge` and does
not hide or restyle Google's challenge iframe. Google owns the popup styling
and high stacking order; the app does not cover it with a loading overlay.

## Google OAuth trust boundary

The app uses Supabase's redirect/PKCE flow, not frontend Google ID-token parsing.
Google scopes include `openid email profile`. Supabase Auth's Google OIDC
provider verifies the ID token signature, expiry and audience against its
configured Google client ID. The provider callback also validates OAuth state
and its expiry/reuse. The app exchanges the resulting one-use code with the
SDK's stored PKCE verifier; it does not expect Google's state on the final app
callback. The signed HttpOnly initiation cookie is consumed atomically once.
The app checks the server-returned Google identity's `email_verified` before
publishing cookies. Form email and editable `user_metadata` are never identity
proof. Verify the configured Google client ID and redirect allowlist in the
Supabase dashboard; those hosted settings are not stored in this repository.

## IPs, proxies and an optional firewall layer

`src/server/client-ip.ts` is the only IP source for limits, CAPTCHA and audit
signals. On Vercel it uses `ipAddress()` and the platform's overwritten header.
Outside Vercel it ignores forwarded headers and uses the socket peer when
available. IPv4-mapped IPv6 is canonicalized; all IPv6 hosts in a `/64` share an
identity. Audit trails apply their existing additional masking.

No Cloudflare or other upstream proxy configuration was found in the repository.
DNS/deployment settings must be checked separately. If a proxy sits in front of
Vercel, the reported peer may be that proxy. Do not start trusting
`CF-Connecting-IP` or another arbitrary header: first restrict ingress to the
trusted proxy and authenticate/validate the proxy-provided header.

A Vercel Firewall rate-limit rule can absorb abusive requests before they reach
Google or the database. Match the actual **POST server-function URLs** used by
login and recovery in the deployed network trace, not just GET `/login` and
`/forgot-password` page URLs. It supplements the in-app limits.

These controls protect the app's server functions. The Supabase URL and
publishable key are public by design for Realtime, so direct Supabase Auth
endpoints remain a separate boundary. Keep Supabase's provider-side rate limits
and abuse controls enabled; app CAPTCHA/counters alone cannot enforce policy on
a request sent directly to the hosted Auth API.

## Local development and verification

Signup's existing local-only Checkbox test-key fallback remains available on
loopback outside Vercel. Invisible login/recovery require their separately
configured Invisible keys, with `localhost` authorized. The server accepts
`localhost` only outside production and rejects Google's public Checkbox test
keys for invisible verification. Missing Invisible configuration fails closed
without disabling the Google login button.

Run `pnpm test`, `pnpm build`, and
`pnpm exec playwright test --config playwright.auth.config.ts`. Browser tests
use isolated Chrome, mocked Google/server responses and test credentials; they
do not create accounts or send mail. Database tests execute the actual migration
and RPCs in embedded Postgres. No hosted migration is applied by these tests.


## Deployment acceptance checklist

Use a test account and your own inbox for actions that send emails. The automated
suite mocks Google/Auth/email and executes the recovery SQL in embedded Postgres.
Items involving a real Google challenge, email delivery, external IPs, hosted
cookie headers, and Vercel scaling still require a deployed smoke test.

- [ ] **a. Missing login token:** replay a password-login request without
  `g-recaptcha-response`; it is rejected before password authentication.
- [ ] **b. Generic credentials:** with fresh CAPTCHA tokens, submit a wrong
  password and a nonexistent email; both show `Invalid email or password`.
- [ ] **c. Account + IP lockout:** fail five times for one account from one IP;
  the fifth response starts the 15-minute cooldown (remaining time is shown).
  Correct credentials from a different IP still succeed.
- [ ] **d. Missing reset token:** remove the token from Send reset code; reject
  before lookup, counter reservation or email delivery.
- [ ] **e. Enumeration:** request once for a real and a nonexistent address;
  both show `If that email exists, we sent a reset code` and code entry.
- [ ] **f. Five wrong codes:** submit five wrong eight-digit codes. The fifth
  says `This code is no longer valid. Request a new one.` The correct old code
  now fails too. A correct fifth submission after four wrong ones may succeed.
- [ ] **g. Inbox spam:** resend before 60 seconds and exceed three requests for
  an email in an hour (also try simultaneous requests). No extra email/code is
  generated. Confirm ten sends per IP per hour and that a resend invalidates
  the older code. Codes expire after ten minutes and are single-use.
- [ ] **h. Google:** Continue with Google on login still works without CAPTCHA
  or a form email. Signup keeps its checkbox and existing OTP behavior.
- [ ] **i. Real client IP:** on Vercel, inspect `getClientIp()` with a temporary,
  protected diagnostic or a debugger and compare it to your public IP. Existing
  audit displays are intentionally masked. Confirm `VERCEL=1`, inspect the
  platform's `x-real-ip`, test IPv6 /64 grouping and ensure any upstream proxy
  is explicitly authenticated before trusting its header. Remove diagnostics
  afterward; do not expose a public raw-IP endpoint.
- [ ] **j. Shared counters:** repeat failed requests across reloads, function
  instances and deployments using the same database; lockouts do not reset.
  Verify unavailable Google/database services fail closed.
- [ ] **k. UI/accessibility:** desktop/mobile, light/dark: check notice contrast,
  linked policies, inline announced errors, fixed button widths, disabled
  loading state and Enter-key submission through CAPTCHA. Trigger Google's
  real image challenge and confirm it stays above the page and can be used on
  mobile. Resend code shows a disabled 60-second countdown. Code verification
  must not execute CAPTCHA.
- [ ] **Session completion:** reset a test account while it is signed in on two
  browsers. Both old sessions lose app access, the password-changed email
  arrives, and the reset authorization cannot be replayed. Check Set-Cookie
  headers for HttpOnly, Secure and SameSite=Lax with Keep me signed in both on
  and off. Check Realtime updates and avatar uploads after access-token refresh.

References:
- [Google Invisible v2](https://developers.google.com/recaptcha/docs/invisible)
- [Google server verification](https://developers.google.com/recaptcha/docs/verify)
- [Badge notice and test keys](https://developers.google.com/recaptcha/docs/faq/)
- [Vercel functions API](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase Google provider implementation](https://github.com/supabase/auth/blob/master/internal/api/provider/google.go)
- [Supabase OAuth state implementation](https://github.com/supabase/auth/blob/master/internal/api/external.go)
