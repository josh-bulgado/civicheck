-- In-system notifications: give each row a machine-readable `type` (so the
-- feed can pick an icon without string-matching the subject) and an
-- `archived_at` so applicants can tidy their feed. Both are additive.
--
-- Archiving is a soft flag rather than a DELETE on purpose: the table doubles
-- as the email outbox, and the existing "Applicants can mark own
-- notifications read" UPDATE policy already lets the owner set it, so no new
-- policy (and no applicant DELETE grant) is needed.

alter table public.notifications
  add column if not exists type text not null default 'status_change',
  add column if not exists archived_at timestamptz;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('status_change', 'pre_validation_complete', 'document_rejected'));

-- Backfill rows written before the column existed, using the fixed subject
-- shapes produced by buildPreValidationCompleteEmail / buildDocumentRejectedEmail.
update public.notifications
set type = 'pre_validation_complete'
where subject like '%: pre-validation complete';

update public.notifications
set type = 'document_rejected'
where subject like '%: a document needs a fix';
