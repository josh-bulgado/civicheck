-- Charter item 13, PDF pages 20-21. Uncertain answers need a recorded staff check.
create or replace function public.guard_court_issuer_validation()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  context jsonb;
begin
  if new.status is not distinct from old.status or new.status <> 'processing'
    or new.request_type not in ('COURT-ANNULMENT', 'COURT-FOREIGN-ADOPTION')
    or coalesce(new.form_data->>'issued_by_rtc_legazpi', '') in ('yes', 'no') then
    return new;
  end if;
  context := coalesce(nullif(current_setting('civicheck.staff_transition', true), ''), '{}')::jsonb;
  if context->>'request_id' is distinct from old.id::text
    or context->>'actor_id' is distinct from auth.uid()::text
    or context->'court_issuer_confirmed' is distinct from 'true'::jsonb
    or old.claimed_by is distinct from auth.uid()
    or old.claimed_stage is distinct from old.status
    or old.claim_expires_at is null or old.claim_expires_at <= clock_timestamp() then
    raise exception 'Verify the issuing court and the additional certificate, if required, before completing validation.';
  end if;
  perform set_config('civicheck.staff_transition', '', true);
  return new;
end;
$$;
revoke all on function public.guard_court_issuer_validation() from public, anon, authenticated;
create trigger guard_court_issuer_validation before update of status on public.requests
  for each row execute function public.guard_court_issuer_validation();

-- Patch the current action function without replacing later payment fixes.
do $migration$
declare
  source text;
  updated text;
begin
  source := pg_get_functiondef('public.save_staff_request_action(uuid,text,text,jsonb,text,uuid,text)'::regprocedure);
  updated := replace(source, $old$    v_status := p_values->>'status';$old$, $new$    v_status := p_values->>'status';
    if v_status = 'processing'
      and r.request_type in ('COURT-ANNULMENT', 'COURT-FOREIGN-ADOPTION')
      and coalesce(r.form_data->>'issued_by_rtc_legazpi', '') not in ('yes', 'no') then
      if p_values->'court_issuer_confirmed' is distinct from 'true'::jsonb then
        raise exception 'Verify the issuing court and the additional certificate, if required, before completing validation.';
      end if;
      p_remarks := concat_ws(' ', nullif(btrim(p_remarks), ''),
        'Verified the issuing court and the Certificate of Registration and Authenticity, if required.');
    end if;
$new$);
  if updated = source then raise exception 'Status action definition changed; review migration'; end if;
  source := updated;
  updated := replace(source,
    $old$'request_id',r.id,'actor_id',auth.uid(),'return_reason',btrim(p_remarks),$old$,
    $new$'request_id',r.id,'actor_id',auth.uid(),'return_reason',btrim(p_remarks),
      'court_issuer_confirmed',p_values->'court_issuer_confirmed',$new$);
  if updated = source then raise exception 'Transition context definition changed; review migration'; end if;
  execute updated;
end;
$migration$;
