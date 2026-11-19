-- Charter item 10, PDF page 16: the final PSA copy follows about one month later.
-- The date is an estimate; staff confirm actual availability and claiming details.
alter table public.requests
  add column psa_endorsed_on date,
  add column claiming_location text check (char_length(claiming_location) <= 240),
  add column claiming_instructions text check (char_length(claiming_instructions) <= 1000),
  add column psa_certificate_available_at timestamptz;

create or replace function public.guard_electronic_endorsement()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'INSERT' then
    if new.psa_endorsed_on is not null or new.claiming_location is not null
      or new.claiming_instructions is not null or new.psa_certificate_available_at is not null then
      raise exception 'Record PSA endorsement details during Processing.';
    end if;
    return new;
  end if;
  if new.psa_certificate_available_at is distinct from old.psa_certificate_available_at then
    raise exception 'Confirm PSA certificate availability through the ready-for-release action.';
  end if;
  if new.psa_endorsed_on is distinct from old.psa_endorsed_on
    or new.claiming_location is distinct from old.claiming_location
    or new.claiming_instructions is distinct from old.claiming_instructions then
    if old.request_type <> 'ELEC_ENDORSEMENT' or old.status <> 'processing' or new.status <> old.status
      or public.get_user_role() is null or public.get_user_role() not in ('staff','supervisor','admin')
      or old.claimed_by is distinct from auth.uid() or old.claimed_stage is distinct from old.status
      or old.claim_expires_at is null or old.claim_expires_at <= clock_timestamp()
      or current_setting('civicheck.endorsement_update', true) is distinct from old.id::text || ':' || auth.uid()::text then
      raise exception 'Use the claimed Processing action to record PSA endorsement details.';
    end if;
    if new.psa_endorsed_on is null
      or new.psa_endorsed_on > (now() at time zone 'Asia/Manila')::date
      or new.psa_endorsed_on < (old.created_at at time zone 'Asia/Manila')::date then
      raise exception 'Enter the actual PSA endorsement date between submission and today.';
    end if;
  end if;
  if old.request_type = 'ELEC_ENDORSEMENT' and new.status is distinct from old.status then
    if new.status = 'ready_for_release' then
      if old.status <> 'processing' or new.psa_endorsed_on is null
        or new.psa_endorsed_on > (now() at time zone 'Asia/Manila')::date
        or nullif(btrim(new.claiming_location), '') is null
        or nullif(btrim(new.claiming_instructions), '') is null
        or current_setting('civicheck.psa_available', true) is distinct from old.id::text || ':' || auth.uid()::text then
        raise exception 'Confirm the final PSA certificate is available and record the claiming location and instructions.';
      end if;
      new.psa_certificate_available_at := clock_timestamp();
    elsif new.status in ('under_validation', 'incomplete', 'rejected') then
      new.psa_certificate_available_at := null;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_electronic_endorsement() from public, anon, authenticated;
create trigger guard_electronic_endorsement before insert or update on public.requests
for each row execute function public.guard_electronic_endorsement();

do $migration$
declare
  original text;
  updated text;
begin
  original := replace(pg_get_functiondef('public.save_staff_request_action(uuid,text,text,jsonb,text,uuid,text)'::regprocedure), chr(13), '');
  updated := replace(original, $old$v_status := p_values->>'status';$old$, $new$v_status := p_values->>'status';
    if r.request_type = 'ELEC_ENDORSEMENT' and v_status = 'ready_for_release' then
      if r.updated_at is distinct from (p_values->>'expected_updated_at')::timestamptz then
        raise exception 'This request changed. Refresh and review the claiming instructions.';
      end if;
      if p_values->'psa_certificate_available_confirmed' is distinct from 'true'::jsonb
        or r.psa_endorsed_on is null or nullif(btrim(r.claiming_location), '') is null
        or nullif(btrim(r.claiming_instructions), '') is null then
        raise exception 'Confirm the final PSA certificate is available and record the claiming location and instructions.';
      end if;
      perform set_config('civicheck.psa_available', r.id::text || ':' || auth.uid()::text, true);
      p_remarks := concat_ws(' ', 'Confirmed final PSA certificate availability. Claiming location: ' || r.claiming_location || '. Instructions: ' || r.claiming_instructions, nullif(btrim(p_remarks), ''));
    end if;$new$);
  if updated = original then raise exception 'Status action changed; review PSA readiness migration'; end if;
  original := updated;
  updated := replace(original, $old$elsif p_action = 'posting_updated' then$old$, $new$elsif p_action = 'endorsement_updated' then
    if r.request_type <> 'ELEC_ENDORSEMENT' or r.status <> 'processing'
      or r.updated_at is distinct from (p_values->>'expected_updated_at')::timestamptz then
      raise exception 'This request changed. Record PSA endorsement details during Processing.';
    end if;
    if (p_values->>'psa_endorsed_on')::date is null
      or (p_values->>'psa_endorsed_on')::date > (now() at time zone 'Asia/Manila')::date
      or (p_values->>'psa_endorsed_on')::date < (r.created_at at time zone 'Asia/Manila')::date then
      raise exception 'Enter the actual PSA endorsement date between submission and today.';
    end if;
    perform set_config('civicheck.endorsement_update', r.id::text || ':' || auth.uid()::text, true);
    update public.requests set psa_endorsed_on = (p_values->>'psa_endorsed_on')::date,
      claiming_location = nullif(btrim(p_values->>'claiming_location'), ''),
      claiming_instructions = nullif(btrim(p_values->>'claiming_instructions'), ''),
      updated_at = clock_timestamp() where id = r.id;
    v_status := 'endorsement_updated';
    p_remarks := concat_ws(' ', 'PSA endorsement date: ' || (p_values->>'psa_endorsed_on') || '.',
      'Claiming location: ' || nullif(btrim(p_values->>'claiming_location'), '') || '.',
      'Claiming instructions: ' || nullif(btrim(p_values->>'claiming_instructions'), '') || '.');
  elsif p_action = 'posting_updated' then$new$);
  if updated = original then raise exception 'Posting action changed; review PSA endorsement migration'; end if;
  original := updated;
  updated := replace(original,
    'r.request_type = ''DEATH_DELAYED'' and r.status = ''processing'' and r.posting_start_date is not null)',
    'r.request_type = ''DEATH_DELAYED'' and r.status = ''processing'' and r.posting_start_date is not null) or (r.request_type = ''ELEC_ENDORSEMENT'' and r.status = ''processing'' and r.psa_endorsed_on is not null)');
  if updated = original then
    updated := replace(original, 'if r.status <> ''ready_for_release'' or r.payment_status',
      'if not (r.status = ''ready_for_release'' or (r.request_type = ''ELEC_ENDORSEMENT'' and r.status = ''processing'' and r.psa_endorsed_on is not null)) or r.payment_status');
  end if;
  if updated = original then raise exception 'Payment action changed; review PSA endorsement migration'; end if;
  execute updated;

  original := replace(pg_get_functiondef('public.guard_request_workflow()'::regprocedure), chr(13), '');
  updated := replace(original,
    'old.request_type = ''DEATH_DELAYED'' and old.status = ''processing'' and old.posting_start_date is not null)',
    'old.request_type = ''DEATH_DELAYED'' and old.status = ''processing'' and old.posting_start_date is not null) or (old.request_type = ''ELEC_ENDORSEMENT'' and old.status = ''processing'' and old.psa_endorsed_on is not null)');
  if updated = original then
    updated := replace(original, 'or old.status is distinct from ''ready_for_release'' then',
      'or not (old.status = ''ready_for_release'' or (old.request_type = ''ELEC_ENDORSEMENT'' and old.status = ''processing'' and old.psa_endorsed_on is not null)) then');
  end if;
  if updated = original then raise exception 'Payment guard changed; review PSA endorsement migration'; end if;
  execute updated;
end;
$migration$;
