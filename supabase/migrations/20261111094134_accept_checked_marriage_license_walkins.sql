-- Charter PDF pages 11-12: checked filing papers and both applicants' appearance.
-- Counseling, payment, and notice posting are later steps.
do $migration$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    original := pg_get_functiondef(to_regprocedure('public.' || function_name || '()'));
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position($needle$'MARRIAGE_LICENSE','RA9255_SURNAME'$needle$ in original) > 0 then continue; end if;
    updated := replace(original,
      $old$'RA9255_SURNAME','BIRTH_ONTIME'$old$,
      $new$'MARRIAGE_LICENSE','RA9255_SURNAME','BIRTH_ONTIME'$new$);
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      original := updated;
      updated := replace(updated,
        $old$new.walk_in_accepted_at := clock_timestamp();$old$,
        $new$if new.request_type = 'MARRIAGE_LICENSE' and (
          new.form_data->>'physical_documents_confirmed' is distinct from 'true'
          or new.form_data->>'couple_appearance_confirmed' is distinct from 'true'
          or new.form_template_version_id is null
        ) then raise exception 'Check the physical papers and confirm both applicants personally appeared before accepting the marriage license walk-in'; end if;
        new.walk_in_accepted_at := clock_timestamp();$new$);
      if updated = original then raise exception 'Expected acceptance timestamp boundary missing'; end if;
    end if;
    execute updated;
  end loop;

  original := pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure);
  if position('marriage-license application' in original) > 0 then return; end if;
  updated := replace(original,
    $old$case when new.request_type$old$,
    $new$case when new.request_type = 'MARRIAGE_LICENSE'
      then 'Accepted walk-in marriage-license application. Checked physical filing papers and both applicants personal appearance. Counseling, payment, and notice posting remain pending.'
      when new.request_type$new$);
  if updated = original then raise exception 'Expected acceptance log boundary missing'; end if;
  execute updated;
end;
$migration$;
