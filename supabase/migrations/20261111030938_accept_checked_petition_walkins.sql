-- Charter PDF pages 17-19: initial filing is separate from publication and
-- PSA affirmation. Keep payment and release guards unchanged.
do $$
declare function_name text; original text; updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    select pg_get_functiondef(to_regprocedure('public.' || function_name || '()')) into original;
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('''RA9048-CFN''' in original) > 0 then continue; end if;
    updated := regexp_replace(original,
      '(new\.request_type in \([^)]*''BIRTH_ONTIME''[^)]*)(\))',
      '\1,''RA9048-CFN'',''RA9048-CCE''\2', 'g');
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      updated := replace(updated, 'new.walk_in_accepted_at := clock_timestamp();',
        'if new.request_type in (''RA9048-CFN'',''RA9048-CCE'') and (
          new.form_data->>''physical_documents_confirmed'' is distinct from ''true''
          or new.form_data->>''petition_authority_confirmed'' is distinct from ''true''
          or new.form_template_version_id is null
        ) then raise exception ''Check the filing papers and petitioner authority before accepting the petition''; end if;
        new.walk_in_accepted_at := clock_timestamp();');
    end if;
    execute updated;
  end loop;

  select pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure) into original;
  if position('''RA9048-CFN''' in original) = 0 then
    updated := regexp_replace(original, 'case[[:space:]]+when new\.request_type',
      'case when new.request_type in (''RA9048-CFN'',''RA9048-CCE'')
        then ''Accepted walk-in petition. Checked filing papers and authority to file. Publication and PSA affirmation remain pending.''
        when new.request_type', 'g');
    if updated = original then raise exception 'Expected walk-in audit boundary missing'; end if;
    execute updated;
  end if;
end $$;
