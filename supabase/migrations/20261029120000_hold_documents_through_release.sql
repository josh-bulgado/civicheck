-- Workflow sweep, October 2026. The document check that guards the start of
-- processing did not hold for the rest of a request's life:
--
-- 1. Ready for release and released assume every uploaded requirement is
--    accepted, but only the move into processing checked it. A decision written
--    straight through PostgREST (the attachment policy allows staff to) skipped
--    the server's return-to-validation, and the request could then be released
--    with that document pending or rejected.
-- 2. A released or rejected request is closed, yet its documents could still
--    be accepted, rejected or reopened by staff and resubmitted by the
--    applicant, alerting staff to review a request that can never move again.
-- 3. One staged file could back two requests when the same application was
--    submitted twice (two tabs), so replacing it on one request deleted the
--    other's evidence.

-- ─── 1. Every document accepted, all the way to release ─────────────────────
-- Same as 20261027120000_security_hardening.sql, except the document check now
-- covers ready_for_release and released as well as processing. The transition
-- list still mirrors ALLOWED_TRANSITIONS in
-- src/features/requests/request-workflow.ts.

create or replace function public.guard_request_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
begin
  -- Server functions on the service role and SECURITY DEFINER routines are
  -- trusted; this guards what a signed-in user can send directly.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'submitted'
      or new.payment_status is distinct from 'unpaid'
      or new.or_number is not null then
      raise exception 'A new request starts submitted and unpaid';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.tracking_number is distinct from old.tracking_number
    or new.applicant_id is distinct from old.applicant_id
    or new.request_type is distinct from old.request_type
    or new.form_data is distinct from old.form_data
    or new.fees_due is distinct from old.fees_due
    or new.copies is distinct from old.copies
    or new.form_template_version_id is distinct from old.form_template_version_id
    or new.created_at is distinct from old.created_at then
    raise exception 'The details of a submitted request cannot be changed directly';
  end if;

  v_role := public.get_user_role();

  if new.payment_status is distinct from old.payment_status
    or new.or_number is distinct from old.or_number then
    if v_role is distinct from 'cashier'
      or old.payment_status is distinct from 'unpaid'
      or new.payment_status is distinct from 'verified'
      or old.status is distinct from 'ready_for_release' then
      raise exception 'Only the cashier verifies payment, once, on a request ready for release';
    end if;
  end if;

  if new.status is distinct from old.status then
    if v_role is null or v_role not in ('staff', 'supervisor', 'admin') then
      raise exception 'Only CCRO staff can move a request through the workflow';
    end if;
    if (old.status::text, new.status::text) not in (
      ('submitted', 'under_validation'),
      ('submitted', 'rejected'),
      ('under_validation', 'incomplete'),
      ('under_validation', 'processing'),
      ('under_validation', 'rejected'),
      ('incomplete', 'under_validation'),
      ('incomplete', 'rejected'),
      ('processing', 'ready_for_release'),
      ('processing', 'under_validation'),
      ('processing', 'rejected'),
      ('ready_for_release', 'released'),
      ('ready_for_release', 'under_validation')
    ) then
      raise exception 'A request cannot move from % to %', old.status, new.status;
    end if;
    if new.status = 'released' and new.payment_status is distinct from 'verified' then
      raise exception 'Payment must be verified before this request can be released';
    end if;
    if new.status in ('processing', 'ready_for_release', 'released') and exists (
      select 1 from public.requirements_attachments a
      where a.request_id = new.id
        and a.verification_status is distinct from 'approved'
    ) then
      raise exception 'Every uploaded requirement must be accepted before processing or release';
    end if;
  end if;

  return new;
end;
$$;

-- ─── 2. A closed request's documents are part of the record ─────────────────
-- Same as 20261027120000_security_hardening.sql, plus the closed-request check.
-- That one applies to every caller, the service role included: the applicant's
-- resubmission runs on the service role, and nothing legitimately changes a
-- document once its request is released or rejected.

create or replace function public.guard_attachment_review_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and (
    new.request_id is distinct from old.request_id
    or new.requirement_name is distinct from old.requirement_name
    or new.subject_role is distinct from old.subject_role
    or new.file_url is distinct from old.file_url
    or new.uploaded_at is distinct from old.uploaded_at
  ) then
    raise exception 'Only the review decision on a document can be changed directly';
  end if;
  if exists (
    select 1 from public.requests r
    where r.id = old.request_id
      and r.status in ('released', 'rejected')
  ) then
    raise exception 'This request is closed. Its documents can no longer change.';
  end if;
  return new;
end;
$$;

-- ─── 3. One file backs one request ──────────────────────────────────────────
-- submitRequestFn reads the 23505 a second submission of the same draft now
-- gets, rolls that duplicate request back, and says it was already submitted.
-- The unique index also serves the storage policy's file_url lookup, so the
-- plain index from the hardening migration is no longer needed.

create unique index if not exists requirements_attachments_file_url_key
  on public.requirements_attachments (file_url);
drop index if exists public.requirements_attachments_file_url_idx;
