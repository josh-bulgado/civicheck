# Citizen feedback and problem reports

This is Civicheck's independent feedback feature. It does not implement an
official government satisfaction questionnaire.

## Database setup

Apply `supabase/migrations/20261108055027_add_citizen_feedback_and_problem_reports.sql`
to the same Supabase project used by the application before deploying the code.
Use the project's normal migration process. No new environment variables are
required. The migration creates two tables, their indexes and row policies, two
guard triggers, and the admin summary function.

## Citizen flow

- A released request offers **Give feedback**. The survey opens only after the
  citizen presses that action or follows a release-notification/email link.
- Overall satisfaction is required. Ease of use, topics, and a comment are
  optional. Each applicant can submit once per completed request; original
  answers remain read-only.
- **Maybe later** dismisses the invitation on that browser. A quiet action stays
  available if the citizen changes their mind.
- If feedback cannot be loaded, its card offers **Retry feedback**. Request
  details, documents, and history remain available. The survey stays closed until
  retry succeeds, including when arriving from a feedback link.
- **Report a problem** is available from the sidebar, mobile account menu, and
  application footer. Category and description are required. The current page
  path and own request, when available, are included; query strings and form
  answers are not collected automatically.
- Reports display a `PR-` reference after saving. The database limits each
  applicant to five reports per ten minutes.

Responses and reports are confidential, associated with the citizen's account,
and readable only by that citizen and active administrators. Staff, supervisors,
cashiers, and system administrators do not receive access through this feature.

## Admin flow

Open **Insights → Feedback & Reports** (`/admin/feedback`). Survey feedback and
problem reports have separate tabs and review states:

- Survey: New → Reviewed / Needs action.
- Problem: New → Under review → Resolved.

Service and inclusive date filters apply to the review list. Dates use Philippine
calendar boundaries. Lists are paginated on the server; survey counts, rating
distribution, and satisfaction percentage cover the complete filtered survey
set. Satisfaction means ratings of four or five divided by all overall ratings.
An empty sample displays a dash. Problem reports never enter satisfaction scores.
Review changes record the administrator and time without changing the submission.

## Verification

```powershell
pnpm.cmd exec vitest run src/features/feedback
pnpm.cmd exec playwright test --config=tests/feedback/playwright.config.ts
pnpm.cmd build
```

The SQL tests execute the migration in isolated Postgres (PGlite) and exercise
actual database roles and row policies. Browser tests use mocked server-function
responses to cover citizen and admin interactions without accessing real citizen
records or sending email. They do not replace a hosted database smoke test after
the migration is applied.
