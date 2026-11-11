-- Citizen's Charter item 13, PDF pages 20-21: check physical court papers at intake.
do $migration$
declare
  function_name text;
  original text;
  updated text;
begin
  foreach function_name in array array['protect_birth_walkin_acceptance', 'guard_request_workflow'] loop
    original := pg_get_functiondef(to_regprocedure('public.' || function_name || '()'));
    if original is null then raise exception 'Missing walk-in guard: %', function_name; end if;
    if position('COURT-ANNULMENT' in original) > 0 then continue; end if;
    updated := replace(original,
      $old$'DEATH_DELAYED','LEGITIMATION')$old$,
      $new$'DEATH_DELAYED','LEGITIMATION','COURT-ANNULMENT','COURT-FOREIGN-ADOPTION')$new$);
    if updated = original then raise exception 'Expected intake boundary missing: %', function_name; end if;
    if function_name = 'protect_birth_walkin_acceptance' then
      original := updated;
      updated := replace(updated,
        $old$new.walk_in_accepted_at := clock_timestamp();$old$,
        $new$if new.request_type in ('COURT-ANNULMENT','COURT-FOREIGN-ADOPTION')
          and coalesce(new.form_data->>'issued_by_rtc_legazpi','') not in ('yes','no') then
          raise exception 'Check whether RTC Legazpi issued the decision before accepting the walk-in';
        end if;
        new.walk_in_accepted_at := clock_timestamp();$new$);
      if updated = original then raise exception 'Expected acceptance timestamp boundary missing'; end if;
    end if;
    execute updated;
  end loop;
  original := replace(pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure), chr(13), '');
  if position('COURT-ANNULMENT' in original) > 0 then return; end if;
  updated := replace(original,
    $old$case when new.request_type = 'LEGITIMATION'$old$,
    $new$case when new.request_type in ('COURT-ANNULMENT','COURT-FOREIGN-ADOPTION')
      then 'Checked four copies of the court papers and verified the issuing court and the Certificate of Registration and Authenticity, if required.'
      when new.request_type = 'LEGITIMATION'$new$);
  if updated = original then raise exception 'Expected acceptance log boundary missing'; end if;
  if position($marker$(new.id,new.walk_in_accepted_by,'processing',$marker$ in updated) = 0 then
    raise exception 'Expected processing log boundary missing';
  end if;
  updated := split_part(updated, $marker$(new.id,new.walk_in_accepted_by,'processing',$marker$, 1)
    || $marker$(new.id,new.walk_in_accepted_by,'processing',$marker$
    || replace(split_part(updated, $marker$(new.id,new.walk_in_accepted_by,'processing',$marker$, 2),
      'Checked four copies of the court papers and verified the issuing court and the Certificate of Registration and Authenticity, if required.',
      'Accepted walk-in court-decree registration. Initial physical screening was completed at intake.');
  execute updated;
end;
$migration$;
