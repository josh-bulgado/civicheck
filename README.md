# CiviCheck

Civil Registry Document Request and Requirement Validation System, built for the City
Civil Registrar Office (CCRO) of the City Government of Legazpi.

CiviCheck lets residents check exactly what documents they need *before* they submit a
request for a birth, marriage, or death certificate, or a certified true copy (CTC) — then
tracks that request from submission to release. For CCRO staff, it organizes incoming
requests into a clear pipeline instead of loose paper/manual tracking.

## Tech stack

- **Frontend:** React 19, TanStack Start (routing/rendering), Tailwind CSS v4, shadcn/ui
- **Backend:** Supabase (auth, Postgres, realtime, storage) — no separate backend server
- **Database:** PostgreSQL via Supabase, normalized relational schema, RLS-enforced
- **Auth:** Supabase Auth with role-based access control (applicant / staff / admin)
- **Package manager:** pnpm

## Users & roles

- **Applicant / Citizen** — browses services, reviews requirement checklists, optionally
  pre-uploads documents, submits a request, tracks status in real time, gets notified,
  pays via QR at the CCRO cashier, claims the document.
- **CCRO Staff** — reviews pre-validation uploads, validates walk-in documents, processes
  requests, marks requests ready for release, encodes walk-in requests for visitors
  without an account.
- **Admin** — manages staff/admin accounts and roles, configures services and requirement
  checklists, monitors request activity, views reports, maintains system settings and
  audit logs.

## Workflow

Every request moves through an explicit `status` field on `requests`:

`submitted` → `under_validation` → (`incomplete` / `rejected`) → `processing` →
`ready_for_release` → `released`

There is no separate approval stage — staff who process a request mark it ready for
release themselves, and the cashier's payment verification is the only gate before
`released`.

Payment is tracked separately via `payment_status` (`unpaid` / `verified`) and is
QR-verification only — the CCRO cashier handles the actual transaction.

## Getting started

### Prerequisites

- Node.js
- [pnpm](https://pnpm.io)
- A Supabase project (or the [Supabase CLI](https://supabase.com/docs/guides/cli) for
  local development)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Required variables:

   | Variable | Description |
   | :--- | :--- |
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
   | `SUPABASE_SECRET_KEY` | Supabase service-role/secret key |
   | `RESEND_API_KEY` | API key for transactional email notifications |
   | `APP_URL` | Base URL of the app (used in emails, redirects, etc.) |

3. Apply database migrations to your Supabase project (see `supabase/migrations`):

   ```bash
   supabase db push
   ```

4. Start the dev server:

   ```bash
   pnpm dev
   ```

### Other scripts

```bash
pnpm build    # type-check and build for production
pnpm preview  # preview the production build
pnpm start    # run the production server
```

## Project structure

```
src/
├── routes/          # TanStack Start file-based routes
├── features/         # Feature modules (route-agnostic logic + components)
│   ├── account/
│   ├── admin/
│   ├── apply/         # Applicant request submission flow
│   ├── auth/
│   ├── cashier/
│   ├── dashboard/      # Role-specific dashboard components
│   ├── forms/
│   ├── landing/
│   ├── notifications/
│   ├── onboarding/
│   ├── requests/       # Staff-facing request pipeline
│   ├── services/       # Document types & requirement checklists
│   ├── system-admin/
│   └── track/          # Public request tracking
├── components/        # Shared UI components (shadcn/ui)
├── hooks/
├── lib/
├── middleware/
├── server/
└── styles/

supabase/
└── migrations/        # SQL migrations (source of truth for schema)
```

Dashboards for each role live under a single `/dashboard` route and switch on the
authenticated user's role rather than using separate route files per role.

## Explicitly out of scope

- Online payment gateway/integration (QR is verification-only; cashiering stays manual)
- AI-based document validation (validation is manual, by CCRO staff)
- SMS notifications (in-system + email only)
- Offline mode
- Integration with external/national government databases (e.g. PSA)
- Multi-office or multi-LGU deployment — this is CCRO-of-Legazpi-only
- Advanced analytics / predictive reporting / BI — basic metrics only

## License

ISC
