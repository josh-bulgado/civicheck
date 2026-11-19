-- Use the same checked physical intake for death registration.
do $$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    select pg_get_functiondef(to_regprocedure('public.' || function_name || '()')) into original;
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('''DEATH_ONTIME'',''DEATH_DELAYED''' in original) > 0 then continue; end if;
    updated := replace(original,
      '(''BIRTH_ONTIME'',''BIRTH_DELAYED'',''MARRIAGE_ONTIME'',''MARRIAGE_DELAYED'')',
      '(''BIRTH_ONTIME'',''BIRTH_DELAYED'',''MARRIAGE_ONTIME'',''MARRIAGE_DELAYED'',''DEATH_ONTIME'',''DEATH_DELAYED'')');
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    execute updated;
  end loop;
end;
$$;

create or replace function public.log_birth_walkin_acceptance()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.walk_in_accepted_by is null then return new; end if;
  insert into public.application_logs(request_id,performed_by_profile_id,action_status,remarks)
  values(new.id,new.walk_in_accepted_by,'walk_in_accepted',
    'Checked the physical documents. The required papers are complete and acceptable.'),
    (new.id,new.walk_in_accepted_by,'processing',
    case when new.request_type in ('DEATH_ONTIME','DEATH_DELAYED')
      then 'Accepted walk-in death request. Initial physical screening was completed at intake.'
      when new.request_type in ('MARRIAGE_ONTIME','MARRIAGE_DELAYED')
      then 'Accepted walk-in marriage request. Initial physical screening was completed at intake.'
      else 'Accepted walk-in birth request. Initial physical screening was completed at intake.' end);
  return new;
end $$;
revoke all on function public.log_birth_walkin_acceptance() from public,anon,authenticated;
