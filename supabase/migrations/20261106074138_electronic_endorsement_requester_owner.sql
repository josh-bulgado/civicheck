-- Keep requester and record-owner details separate for electronic endorsement.
do $$
declare
  target record;
  source_definition jsonb;
  requester_fields jsonb;
  owner_fields jsonb;
  case_sections jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'elec_endorsement'
  for update of t;
  if not found then raise exception 'Electronic endorsement template not found'; end if;

  if exists (select 1 from jsonb_array_elements(target.definition->'sections') s
    where s->>'key' = 'details_requester') then return; end if;

  select v.definition into source_definition
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'ctc_issuance';
  if not found then raise exception 'Requester-owner reference template not found'; end if;

  select jsonb_agg(case when f->>'key' = 'requester_relationship' then
    (f - 'helpText') || jsonb_build_object(
      'helpText', 'Tell us how you are related to the person named on the record. Staff will verify your authority to request endorsement.',
      'options', (select jsonb_agg(case when o->>'value' = 'representative' then
        o || jsonb_build_object('label', 'Other relationship') else o end order by oi)
        from jsonb_array_elements(f->'options') with ordinality as options(o, oi)))
    else f end order by fi) into requester_fields
  from jsonb_array_elements(source_definition->'sections') s,
    jsonb_array_elements(s->'fields') with ordinality as fields(f, fi)
  where s->>'key' = 'details_requester'
    and f->>'key' not in ('purpose_of_request', 'purpose_of_request_other');

  select jsonb_agg(f order by fi) into owner_fields
  from jsonb_array_elements(source_definition->'sections') s,
    jsonb_array_elements(s->'fields') with ordinality as fields(f, fi)
  where s->>'key' = 'details' and f->>'key' in (
    'subjects', 'wife_maiden_name', 'event_date', 'event_place',
    'death_date', 'death_place', 'marriage_date', 'marriage_place');

  if requester_fields is null or owner_fields is null then
    raise exception 'Requester-owner reference fields not found';
  end if;

  select jsonb_agg(jsonb_set(s, '{fields}', (
    select coalesce(jsonb_agg(f order by fi), '[]'::jsonb)
    from jsonb_array_elements(s->'fields') with ordinality as fields(f, fi)
    where f->>'key' not in ('event_date', 'event_place')
  )) order by si) into case_sections
  from jsonb_array_elements(target.definition->'sections') with ordinality as sections(s, si)
  where s->>'step' = 'case';

  next_definition := jsonb_set(target.definition, '{sections}', case_sections || jsonb_build_array(
    jsonb_build_object('key', 'details_requester', 'step', 'details',
      'title', 'Requester''s Information', 'singleColumn', true, 'fields', requester_fields),
    jsonb_build_object('key', 'details', 'step', 'details',
      'title', 'Owner''s Information', 'singleColumn', true, 'fields', owner_fields)
  ));

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end
$$;
