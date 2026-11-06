-- Keep the physical check distinct from accepting uploaded copies.
create or replace function public.needs_original_document_check(p_service text, p_status text)
returns boolean language sql immutable set search_path = public as $$
  select upper(coalesce(p_service, '')) <> 'EMAIL_INQUIRY' and (
    p_status = 'released' or (
      p_status = 'ready_for_release' and upper(p_service) in ('MARRIAGE_ONTIME','MARRIAGE_DELAYED','OTCOLB-MARITAL','OTCOLB-NONMARITAL','DCOLB-0079-BRAP','DCOLB-0079-NORMAL-MARITAL','DCOLB-0079-NORMAL-NONMARITAL','DCOLB-80UP-BRAP','DCOLB-80UP-NORMAL-MARITAL','DCOLB-80UP-NORMAL-NONMARITAL','DEATH_ONTIME','DEATH_DELAYED','BIRTH_ONTIME','BIRTH_DELAYED')
    )
  );
$$;

create or replace function public.record_original_document_check()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') or new.status is not distinct from old.status
    or not public.needs_original_document_check(old.request_type, new.status) then
    return new;
  end if;
  if public.get_user_role() is null or public.get_user_role() not in ('staff', 'supervisor', 'admin')
    or old.claimed_by is distinct from auth.uid()
    or old.claimed_stage is distinct from old.status
    or old.claim_expires_at is null or old.claim_expires_at <= clock_timestamp() then
    raise exception 'Start handling this stage before confirming the originals.';
  end if;
  if current_setting('civicheck.original_document_check', true) is distinct from
    old.id::text || ':' || new.status::text || ':' || auth.uid()::text then
    raise exception 'Confirm that you checked the original documents before continuing.';
  end if;
  perform set_config('civicheck.original_document_check', '', true);
  insert into public.application_logs(request_id, performed_by_profile_id, action_status, remarks)
    values(old.id, auth.uid(), 'hard_copies_validated',
      'Checked the originals and hard copies against the submitted details and any uploaded copies.');
  return new;
end;
$$;
revoke all on function public.record_original_document_check() from public, anon, authenticated;
drop trigger if exists record_original_document_check on public.requests;
create trigger record_original_document_check before update of status on public.requests
  for each row execute function public.record_original_document_check();

-- Lock the request until its action and history have both been saved.
create or replace function public.save_staff_request_action(
  p_request_id uuid,
  p_expected_status text,
  p_action text,
  p_values jsonb,
  p_remarks text,
  p_attachment_id uuid default null,
  p_expected_verification text default null
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.requests%rowtype;
  a public.requirements_attachments%rowtype;
  v_role text := public.get_user_role();
  v_status text;
  v_returned boolean := false;
begin
  if auth.uid() is null or v_role is null then
    raise exception 'Not authenticated';
  end if;
  select * into r from public.requests where id = p_request_id for update;
  if not found then raise exception 'That request no longer exists.'; end if;
  if r.status is distinct from p_expected_status then
    raise exception 'This request changed. Refresh and try again.';
  end if;
  if p_action = 'payment_verified' then
    if v_role <> 'cashier' then raise exception 'Only the cashier verifies payment.'; end if;
  else
    if v_role not in ('staff', 'supervisor', 'admin') then raise exception 'Staff access required.'; end if;
    if r.claimed_by is distinct from auth.uid()
      or r.claimed_stage is distinct from r.status
      or r.claim_expires_at is null or r.claim_expires_at <= clock_timestamp() then
      raise exception 'Your handling claim changed or expired. Start handling this stage again.';
    end if;
  end if;

  if p_action = 'status' then
    v_status := p_values->>'status';
    if v_status is null or v_status = r.status then raise exception 'Choose a new status.'; end if;
    if v_status in ('incomplete', 'rejected') and nullif(trim(p_remarks), '') is null then
      raise exception 'Please give the applicant a reason for this decision.';
    end if;
    if public.needs_original_document_check(r.request_type, v_status) then
      if (p_values->>'originals_confirmed')::boolean is distinct from true then
        raise exception 'Confirm that you checked the original documents before continuing.';
      end if;
      perform set_config('civicheck.original_document_check',
        r.id::text || ':' || v_status || ':' || auth.uid()::text, true);
    end if;
    update public.requests set status = v_status, updated_at = clock_timestamp() where id = r.id;
  elsif p_action = 'posting_updated' then
    if r.status <> 'processing' or r.updated_at is distinct from (p_values->>'expected_updated_at')::timestamptz then
      raise exception 'This request changed. Refresh and try again.';
    end if;
    update public.requests set posting_start_date = (p_values->>'posting_start_date')::date where id = r.id;
    v_status := 'posting_updated';
  elsif p_action = 'payment_verified' then
    if r.status <> 'ready_for_release' or r.payment_status is distinct from 'unpaid'
      or r.fees_due is distinct from (p_values->>'fees_due')::numeric then
      raise exception 'This request changed. Refresh and try again.';
    end if;
    if (r.fees_due > 0 and nullif(trim(p_values->>'or_number'), '') is null)
      or (r.fees_due <= 0 and (p_values->>'confirm_no_fee')::boolean is distinct from true) then
      raise exception 'Confirm the payment or that no fee is due.';
    end if;
    update public.requests set payment_status = 'verified',
      or_number = case when r.fees_due > 0 then trim(p_values->>'or_number') else null end,
      updated_at = clock_timestamp() where id = r.id;
    v_status := 'payment_verified';
  elsif p_action in ('document_review', 'document_reverted') then
    if r.status in ('submitted', 'released', 'rejected', 'cancelled') then
      raise exception 'This stage does not allow document review.';
    end if;
    select * into a from public.requirements_attachments
      where id = p_attachment_id and request_id = r.id for update;
    if not found or a.verification_status is distinct from p_expected_verification then
      raise exception 'Another staff member already reviewed this document. Refresh and check their decision.';
    end if;
    if p_action = 'document_reverted' then
      if v_role not in ('supervisor', 'admin') then raise exception 'Only a supervisor or admin can reopen a decision.'; end if;
      if a.verification_status not in ('approved', 'rejected') or nullif(trim(p_remarks), '') is null then
        raise exception 'Give a reason for reopening this decision.';
      end if;
      update public.requirements_attachments set verification_status = 'pending', rejection_reason = null where id = a.id;
      v_status := 'document_reverted';
    else
      if a.verification_status <> 'pending' or (p_values->>'verification_status') not in ('approved', 'rejected')
        or p_values->>'verification_status' is null then raise exception 'Invalid document decision.'; end if;
      if p_values->>'verification_status' = 'rejected' and nullif(trim(p_values->>'rejection_reason'), '') is null then
        raise exception 'Say why the document was rejected.';
      end if;
      update public.requirements_attachments
        set verification_status = p_values->>'verification_status',
          rejection_reason = case when p_values->>'verification_status' = 'rejected' then p_values->>'rejection_reason' else null end
        where id = a.id;
      v_status := case when p_values->>'verification_status' = 'approved' then 'document_approved' else 'document_rejected' end;
    end if;
    if r.status in ('processing', 'ready_for_release')
      and (p_action = 'document_reverted' or p_values->>'verification_status' = 'rejected') then
      update public.requests set status = 'under_validation', updated_at = clock_timestamp() where id = r.id;
      insert into public.application_logs(request_id, performed_by_profile_id, action_status, remarks)
        values(r.id, auth.uid(), 'under_validation', 'Returned to validation — staff are re-checking a document.');
      v_returned := true;
    end if;
  else
    raise exception 'Unknown request action.';
  end if;

  insert into public.application_logs(request_id, performed_by_profile_id, action_status, remarks)
    values(r.id, auth.uid(), v_status, p_remarks);
  return v_returned;
end;
$$;
revoke all on function public.save_staff_request_action(uuid,text,text,jsonb,text,uuid,text) from public, anon;
grant execute on function public.save_staff_request_action(uuid,text,text,jsonb,text,uuid,text) to authenticated;

