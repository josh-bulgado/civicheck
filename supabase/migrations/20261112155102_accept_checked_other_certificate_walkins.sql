-- Charter item 15, PDF pages 22-23: staff check the original form and agency letter.
-- Accepted walk-ins start Processing and unpaid, using existing acceptance guards.
do $migration$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    original := pg_get_functiondef(to_regprocedure('public.' || function_name || '()'));
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('OTHER_CERT' in original) > 0 then continue; end if;
    updated := replace(original,
      $old$'SUPPLEMENTAL_REPORT','DEATH_DELAYED'$old$,
      $new$'OTHER_CERT','SUPPLEMENTAL_REPORT','DEATH_DELAYED'$new$);
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      original := updated;
      updated := replace(updated,
        $old$new.walk_in_accepted_at := clock_timestamp();$old$,
        $new$if new.request_type = 'OTHER_CERT' and (
          new.form_data->>'physical_documents_confirmed' is distinct from 'true'
          or new.form_template_version_id is null
        ) then raise exception 'Check the original verification form and agency letter before accepting the walk-in'; end if;
        new.walk_in_accepted_at := clock_timestamp();$new$);
      if updated = original then raise exception 'Expected acceptance timestamp boundary missing'; end if;
    end if;
    execute updated;
  end loop;

  original := pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure);
  if position('OTHER_CERT' in original) > 0 then return; end if;
  updated := replace(original,
    $old$case when new.request_type$old$,
    $new$case when new.request_type = 'OTHER_CERT'
      then 'Accepted walk-in Other Certificates request. Checked the original verification form and agency letter. Record search and certification preparation may proceed; payment remains unpaid.'
      when new.request_type$new$);
  if updated = original then raise exception 'Expected acceptance log boundary missing'; end if;
  execute updated;
end;
$migration$;
