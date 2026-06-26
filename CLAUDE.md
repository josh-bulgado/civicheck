# CiviCheck — Project Context

Civil Registry Document Request and Requirement Validation System with Workflow
Optimization, built for the City Civil Registrar Office (CCRO) of the City Government of
Legazpi. Read this whole file before working on any task in this repo.

## 1. What this is

CiviCheck lets residents check exactly what documents they need *before* they submit a
request for a birth, marriage, or death certificate, or a certified true copy (CTC) — then
tracks that request from submission to release. For CCRO staff, it organizes incoming
requests into a clear pipeline instead of loose paper/manual tracking.

**Core idea: requirement validation first, workflow visibility second.** Most competing
systems (cited in the proposal's literature review) focus on online submission + tracking
but skip structured requirement checklists, which is why applicants keep submitting
incomplete requests and have to make repeat trips. That gap is the whole reason this
system exists — don't let any feature work undermine it.

## 2. Users & roles (RBAC — 3 roles)

- **Applicant / Citizen** — selects a service, views its requirement checklist, optionally
  uploads documents for pre-validation, submits a request intent, gets a tracking number,
  monitors status in real time, gets notified, pays via QR at the CCRO cashier, claims the
  document.
- **CCRO Staff** — logs in to a dashboard of submitted requests, reviews pre-validation
  uploads before the applicant's visit, validates walk-in documents (accepted / incomplete /
  rejected), processes and approves, marks ready for release.
- **Admin** — manages staff/admin accounts and roles, configures document types and their
  requirement checklists (including inter-office dependency notes, e.g. barangay/court/PSA
  prerequisites), monitors all request activity, views reports/analytics (volume,
  processing time, frequency of incomplete submissions), maintains system settings and
  audit logs.

## 3. Tech stack — use exactly this, don't substitute

- **Frontend:** React 18+, TanStack Start (routing/rendering), Tailwind CSS v3.x,
  shadcn/ui (forms, tables, dialogs, nav)
- **Backend:** Supabase (Backend-as-a-Service) — auth, Postgres, realtime sync. No
  separate backend server.
- **Database:** PostgreSQL v15+ via Supabase, normalized schema
- **Auth:** Supabase Auth with role-based access control (applicant / staff / admin)
- **Dev tooling:** VS Code, Git/GitHub

## 4. Workflow stages (the backbone of the whole system)

Every request moves through exactly these five stages — model this as an explicit status
field, not an implicit one:

1. **Submission** — request intent captured, tracking number generated
2. **Validation** — staff check completeness against the requirement checklist →
   accepted / incomplete / rejected
3. **Processing** — staff prepare the civil registry record
4. **Approval** — request signed off
5. **Release** — payment confirmed via QR (cashier handles the actual transaction), document
   handed over, release recorded

## 5. Core features to build

1. Requirement checklist viewer per document type, with inter-office dependency notes
   (e.g. "you'll need a barangay certificate first")
2. Request intake — both online self-service **and** staff-assisted walk-in encoding
   (hybrid by design — don't make either path mandatory)
3. Optional pre-validation document upload before the applicant's office visit
4. Auto-generated unique tracking number per request
5. Real-time status tracking for applicants (no polling-by-phone-call)
6. Notifications — **in-system + email only**
7. QR-code based payment **verification** (the LGU cashier still processes the actual
   payment — this system confirms status, it doesn't move money)
8. Document generation/printing for official release
9. Admin reporting: request volume, processing time, frequency of incomplete submissions
10. Audit logs of logins, submissions, and admin actions

## 6. Explicitly out of scope — do not build these

- ❌ Online payment gateway/integration (QR is verification-only; cashiering stays manual)
- ❌ AI-based document validation (validation is manual, by CCRO staff, on purpose)
- ❌ SMS notifications (cost/third-party reliance — in-system + email only)
- ❌ Offline mode (requires live internet/Supabase sync)
- ❌ Integration with external/national government databases (e.g. PSA record
  auto-verification)
- ❌ Multi-office or multi-LGU deployment — this is CCRO-of-Legazpi-only
- ❌ Advanced analytics / predictive reporting / BI — basic metrics only

If a feature request sounds like it belongs in this list, flag it back to the user rather
than quietly building it.

## 7. Database entities (design around these)

- **Users** — applicant / staff / admin profiles, role, credentials
- **Document Types** — birth cert, marriage cert, death cert, CTC, etc.
- **Requirements** — required documents per document type, with an inter-office
  dependency tag
- **Document Requests** — applicant, document type, submission date, unique tracking
  number
- **Workflow Stages / Status** — submission / validation / processing / approval / release,
  tied to a request
- **Notifications** — system-generated updates linked to a request + user
- **Audit Logs** — logins, submissions, admin actions

Relationships should be enforced via foreign keys/constraints — this is a normalized
relational design, not a document store.

## 8. Screens/pages this app needs

- **Public landing page** — marketing/info, no login required (see copy in §9)
- **Auth** — register, login, forgot/reset password
- **Applicant flow** — browse services → view checklist → (optional) pre-validate upload →
  submit request intent → tracking number → status tracker → notifications → QR for
  payment → release info
- **Staff dashboard** — request queue, pre-validation review, validate/process/approve,
  release prep
- **Admin dashboard** — user management, document-type & requirement config, request
  monitoring, reports/analytics, system settings

## 9. Landing page copy (ready to paste in — replace the placeholder text with this)

**Eyebrow / tag:**
City Civil Registrar Office · City Government of Legazpi

**Hero headline:**
Know What You Need. Before You Need It.

**Hero subheadline:**
CiviCheck shows you the exact requirements for your birth, marriage, or death certificate,
or certified true copy request — then tracks it from submission to release, so you're not
making repeat trips to the CCRO just to find out you forgot a document.

**Primary CTA:** Check My Requirements
**Secondary CTA:** Track an Existing Request

**How it works (4 steps):**
1. **Select Your Document** — Choose the civil registry document you need.
2. **Review Your Checklist** — See exactly what's required, including anything you need
   from another office first.
3. **Submit & Get a Tracking Number** — Submit online or at the CCRO window, and get a
   tracking number to follow your request.
4. **Track, Get Notified, Claim** — Watch your request move through validation,
   processing, and approval, get notified when it's ready, then claim it at the CCRO.

**Services offered (cards):**
- Birth Certificate
- Marriage Certificate
- Death Certificate
- Certified True Copy (CTC)

**Why CiviCheck (feature cards):**
- **Clear Requirement Checklists** — Stop guessing. See exactly what to bring, before you
  leave the house.
- **Real-Time Status Tracking** — Check where your request stands, anytime, online.
- **Online or Walk-In** — Submit digitally, or have CCRO staff encode your request in
  person. Either way works.
- **Fewer Repeat Trips** — Pre-validation catches missing documents early, so you're not
  turned away at the counter.
- **Timely Notifications** — Get updates by email and in-system as your request moves
  forward.
- **Role-Based Access** — Your information is only visible to authorized CCRO personnel.

**About blurb:**
The City Civil Registrar Office (CCRO) of Legazpi City registers and issues official
birth, marriage, death, and other civil registry records. CiviCheck was built to make that
process clearer and faster for residents and staff alike, without changing how the office
legally operates.

**Footer:**
City Civil Registrar Office · City Government of Legazpi
[INSERT actual office address / hours / contact number — not in the source proposal]

> Note: the office address, hours, and contact number above are placeholders. Pull the
> real ones from the CCRO before shipping — don't invent them.

## 10. How to work in this repo

- Read this file in full before starting any task.
- When in doubt about a feature, check §6 (out of scope) before building it.
- The five workflow stages in §4 are the spine of the data model — new features should
  hook into them, not bypass them.
