-- Citizen's Charter item 12, PDF pages 19-20: checked papers and required appearance.
-- Extend the existing staff intake boundary; retain payment and release guards.
do $migration$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    original := pg_get_functiondef(to_regprocedure('public.' || function_name || '()'));
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('RA9255_SURNAME' in original) > 0 then continue; end if;
    updated := replace(original,
      $old$'BIRTH_ONTIME','BIRTH_DELAYED'$old$,
      $new$'RA9255_SURNAME','BIRTH_ONTIME','BIRTH_DELAYED'$new$);
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      original := updated;
      updated := replace(updated,
        $old$new.walk_in_accepted_at := clock_timestamp();$old$,
        $new$if new.request_type = 'RA9255_SURNAME' then
          if new.form_data->>'personal_appearance_confirmed' is distinct from 'true' then
            raise exception 'Confirm the required personal appearance, signatures, and attestation for the child age before encoding';
          end if;
          if coalesce(new.form_data->>'father_on_record','') not in ('yes','no') then
            raise exception 'Check the father acknowledgment on the birth certificate before accepting the walk-in';
          end if;
        end if;
        new.walk_in_accepted_at := clock_timestamp();$new$);
      if updated = original then raise exception 'Expected acceptance timestamp boundary missing'; end if;
    end if;
    execute updated;
  end loop;

  original := pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure);
  if position('RA9255_SURNAME' in original) > 0 then return; end if;
  updated := replace(original,
    $old$case when new.request_type$old$,
    $new$case when new.request_type = 'RA9255_SURNAME'
      then 'Accepted walk-in R.A. 9255 surname-change request. Checked physical documents and the required personal appearance, signatures, and attestation for the child age.'
      when new.request_type$new$);
  if updated = original then raise exception 'Expected acceptance log boundary missing'; end if;
  execute updated;
end;
$migration$;
