-- Citizen's Charter PDF pp. 10-11: delayed death eligibility and checklist.
do $$
declare
  target record;
  next_definition jsonb;
  next_id uuid;
  basis jsonb := '{"key":"death_registration_basis","type":"select","label":"Reason for delayed registration","required":true,"options":[{"value":"beyond_30_days","label":"More than 30 days since the death"},{"value":"no_existing_record","label":"No existing record at the LCR or PSA"}],"helpText":"Staff will verify the record status and supporting documents."}'::jsonb;
begin
  select t.id,v.definition into strict target from public.form_templates t
    join public.form_template_versions v on v.id=t.active_version_id
    where t.template_key='death_delayed';
  select jsonb_set(target.definition,'{sections}',jsonb_agg(
    case when section->>'step'='case' then jsonb_set(section,'{fields}',
      jsonb_build_array(basis) || coalesce((select jsonb_agg(f order by ord)
        from jsonb_array_elements(section->'fields') with ordinality as fields(f,ord)
        where f->>'key'<>'death_registration_basis'),'[]'::jsonb))
    else section end order by position)) into next_definition
    from jsonb_array_elements(target.definition->'sections') with ordinality as sections(section,position);
  next_definition := jsonb_set(next_definition,'{eventTiming,appliesWhen}',
    '{"field":"death_registration_basis","operator":"equals","value":"beyond_30_days"}'::jsonb);
  if next_definition is distinct from target.definition then
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
      select target.id,coalesce(max(version),0)+1,'published',next_definition,now()
      from public.form_template_versions where template_id=target.id returning id into next_id;
    update public.form_templates set active_version_id=next_id,updated_at=now() where id=target.id;
  end if;
end;
$$;

update public.service_requirements_metadata set applies_when=null,is_mandatory=true
where service_code='DEATH_DELAYED' and requirement_name ilike 'Burial Certificate%';

-- Preserve permission, receipt, audit and release checks; change payment timing.
do $$
declare
  source text;
  updated text;
begin
  source := pg_get_functiondef('public.save_staff_request_action(uuid,text,text,jsonb,text,uuid,text)'::regprocedure);
  updated := replace(source,
    'if r.status <> ''ready_for_release'' or r.payment_status is distinct from ''unpaid''',
    'if not (r.status = ''ready_for_release'' or (r.request_type = ''DEATH_DELAYED'' and r.status = ''processing'' and r.posting_start_date is not null)) or r.payment_status is distinct from ''unpaid''');
  if updated=source then raise exception 'Payment action definition changed; review migration'; end if;
  execute updated;

  source := pg_get_functiondef('public.guard_request_workflow()'::regprocedure);
  updated := replace(source,
    'or old.status is distinct from ''ready_for_release'' then',
    'or not (old.status = ''ready_for_release'' or (old.request_type = ''DEATH_DELAYED'' and old.status = ''processing'' and old.posting_start_date is not null)) then');
  if updated=source then raise exception 'Payment guard definition changed; review migration'; end if;
  execute updated;

  source := pg_get_functiondef('public.trg_notify_request_payment_verified()'::regprocedure);
  updated := replace(source,'begin' || chr(10),
    'begin' || chr(10) || '  if new.status <> ''ready_for_release'' then return null; end if;' || chr(10));
  if updated=source then raise exception 'Payment notification definition changed; review migration'; end if;
  execute updated;

  -- Converted requests already have a known delayed basis.
  source := pg_get_functiondef('public.convert_expired_registrations(uuid)'::regprocedure);
  updated := replace(source,
    'v_answers:=coalesce(r.form_data,''{}''::jsonb)||jsonb_build_object(''registration_type'',''delayed'');',
    'v_answers:=coalesce(r.form_data,''{}''::jsonb)||jsonb_build_object(''registration_type'',''delayed'');
    if v_code=''DEATH_DELAYED'' then v_answers:=v_answers||jsonb_build_object(''death_registration_basis'',''beyond_30_days''); end if;');
  if updated=source then raise exception 'Conversion definition changed; review migration'; end if;
  execute updated;
end;
$$;
