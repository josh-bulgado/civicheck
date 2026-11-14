-- Charter item 10, PDF pages 15-16: check the selected case's physical papers.
-- Acceptance starts processing; it does not record payment or PSA transmission.
do $migration$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    original := pg_get_functiondef(to_regprocedure('public.' || function_name || '()'));
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('ELEC_ENDORSEMENT' in original) > 0 then continue; end if;
    updated := replace(original,
      $old$'OTHER_CERT','SUPPLEMENTAL_REPORT'$old$,
      $new$'ELEC_ENDORSEMENT','OTHER_CERT','SUPPLEMENTAL_REPORT'$new$);
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      original := updated;
      updated := replace(updated,
        $old$new.walk_in_accepted_at := clock_timestamp();$old$,
        $new$if new.request_type = 'ELEC_ENDORSEMENT' and (
          new.form_data->>'physical_documents_confirmed' is distinct from 'true'
          or new.form_template_version_id is null
          or coalesce(new.form_data->>'endorsement_type', '') not in ('advance','negative','blurred')
          or coalesce(new.form_data->>'record_type', '') not in ('birth','death','marriage')
        ) then raise exception 'Check the physical papers and select the endorsement and record types before accepting the walk-in'; end if;
        new.walk_in_accepted_at := clock_timestamp();$new$);
      if updated = original then raise exception 'Expected acceptance timestamp boundary missing'; end if;
    end if;
    execute updated;
  end loop;

  original := pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure);
  if position('ELEC_ENDORSEMENT' in original) > 0 then return; end if;
  updated := replace(original,
    $old$case when new.request_type$old$,
    $new$case when new.request_type = 'ELEC_ENDORSEMENT'
      then 'Accepted walk-in Electronic Endorsement request. Checked the physical papers for the selected endorsement type. PSA transmission and payment remain pending.'
      when new.request_type$new$);
  if updated = original then raise exception 'Expected acceptance log boundary missing'; end if;
  execute updated;
end;
$migration$;
