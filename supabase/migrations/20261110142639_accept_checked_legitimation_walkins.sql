-- Citizen's Charter 2025, PDF pages 8-9: checked papers and the couple's appearance.
-- Extend the existing intake boundary without changing payment or release controls.
do $$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    select pg_get_functiondef(to_regprocedure('public.' || function_name || '()')) into original;
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('''LEGITIMATION''' in original) > 0 then continue; end if;
    updated := replace(original,
      '(''BIRTH_ONTIME'',''BIRTH_DELAYED'',''MARRIAGE_ONTIME'',''MARRIAGE_DELAYED'',''DEATH_ONTIME'',''DEATH_DELAYED'')',
      '(''BIRTH_ONTIME'',''BIRTH_DELAYED'',''MARRIAGE_ONTIME'',''MARRIAGE_DELAYED'',''DEATH_ONTIME'',''DEATH_DELAYED'',''LEGITIMATION'')');
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      if position('new.walk_in_accepted_at := clock_timestamp();' in updated) = 0 then
        raise exception 'Expected acceptance timestamp boundary missing';
      end if;
      updated := replace(updated,
        'new.walk_in_accepted_at := clock_timestamp();',
        'if new.request_type = ''LEGITIMATION''
          and new.form_data->>''couple_appearance_confirmed'' is distinct from ''true'' then
          raise exception ''Confirm that both parents personally appeared before encoding'';
        end if;
        new.walk_in_accepted_at := clock_timestamp();');
    end if;
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
    case when new.request_type = 'LEGITIMATION'
      then 'Checked the physical documents. The required papers are complete and acceptable. Both parents personally appeared.'
      else 'Checked the physical documents. The required papers are complete and acceptable.' end),
    (new.id,new.walk_in_accepted_by,'processing',
    case when new.request_type = 'LEGITIMATION'
      then 'Accepted walk-in legitimation request. Initial physical screening was completed at intake.'
      when new.request_type in ('DEATH_ONTIME','DEATH_DELAYED')
      then 'Accepted walk-in death request. Initial physical screening was completed at intake.'
      when new.request_type in ('MARRIAGE_ONTIME','MARRIAGE_DELAYED')
      then 'Accepted walk-in marriage request. Initial physical screening was completed at intake.'
      else 'Accepted walk-in birth request. Initial physical screening was completed at intake.' end);
  return new;
end $$;
revoke all on function public.log_birth_walkin_acceptance() from public,anon,authenticated;
