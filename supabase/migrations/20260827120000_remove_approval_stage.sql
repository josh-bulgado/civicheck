-- Remove the Approval workflow stage.
--
-- The CCRO decided a request does not need a separate registrar sign-off: once
-- the cashier verifies payment, staff release the document directly. The
-- workflow collapses from five stages to four (Submission, Validation,
-- Processing, Release) and 'pending_approval' stops being a valid status.
--
-- Rows already waiting on sign-off were prepared and only needed approval, so
-- they land on 'ready_for_release' rather than being sent back a step.
--
-- application_logs.action_status is deliberately left alone: historical
-- 'pending_approval' entries are audit history and must stay accurate. That
-- column has no check constraint, and the UI title-cases unknown values, so
-- old entries still render as "Pending Approval" in the applicant timeline.

alter table public.requests
  drop constraint if exists requests_status_check;

update public.requests
set status = 'ready_for_release'
where status = 'pending_approval';

alter table public.requests
  add constraint requests_status_check
  check (status in (
    'submitted',
    'under_validation',
    'incomplete',
    'rejected',
    'processing',
    'ready_for_release',
    'released'
  ));
