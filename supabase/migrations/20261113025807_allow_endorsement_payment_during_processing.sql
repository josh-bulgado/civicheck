-- Electronic Endorsement payment does not depend on the date sent to PSA.
do $migration$
declare
  original text;
  updated text;
begin
  original := replace(pg_get_functiondef('public.save_staff_request_action(uuid,text,text,jsonb,text,uuid,text)'::regprocedure), chr(13), '');
  updated := replace(original,
    'r.request_type = ''ELEC_ENDORSEMENT'' and r.status = ''processing'' and r.psa_endorsed_on is not null',
    'r.request_type = ''ELEC_ENDORSEMENT'' and r.status = ''processing''');
  if updated = original then raise exception 'Payment action changed; review endorsement payment migration'; end if;
  execute updated;

  original := replace(pg_get_functiondef('public.guard_request_workflow()'::regprocedure), chr(13), '');
  updated := replace(original,
    'old.request_type = ''ELEC_ENDORSEMENT'' and old.status = ''processing'' and old.psa_endorsed_on is not null',
    'old.request_type = ''ELEC_ENDORSEMENT'' and old.status = ''processing''');
  if updated = original then raise exception 'Payment guard changed; review endorsement payment migration'; end if;
  execute updated;
end;
$migration$;
