-- Charter item 14, PDF pages 21-22: physical papers and personal appearance.
do $migration$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    original := pg_get_functiondef(to_regprocedure('public.' || function_name || '()'));
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('SUPPLEMENTAL_REPORT' in original) > 0 then continue; end if;
    updated := replace(original,
      $old$'DEATH_DELAYED','LEGITIMATION'$old$,
      $new$'SUPPLEMENTAL_REPORT','DEATH_DELAYED','LEGITIMATION'$new$);
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      original := updated;
      updated := replace(updated,
        $old$new.walk_in_accepted_at := clock_timestamp();$old$,
        $new$if new.request_type = 'SUPPLEMENTAL_REPORT'
          and new.form_data->>'personal_appearance_confirmed' is distinct from 'true' then
          raise exception 'Confirm the applicant personal appearance before encoding';
        end if;
        new.walk_in_accepted_at := clock_timestamp();$new$);
      if updated = original then raise exception 'Expected acceptance timestamp boundary missing'; end if;
    end if;
    execute updated;
  end loop;
  original := pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure);
  if position('SUPPLEMENTAL_REPORT' in original) > 0 then return; end if;
  updated := replace(original,
    $old$case when new.request_type$old$,
    $new$case when new.request_type = 'SUPPLEMENTAL_REPORT'
      then 'Accepted walk-in Supplemental Report. Physical documents and personal appearance were checked at intake.'
      when new.request_type$new$);
  if updated = original then raise exception 'Expected acceptance log boundary missing'; end if;
  execute updated;
end;
$migration$;
