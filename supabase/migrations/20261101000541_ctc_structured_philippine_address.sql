-- Trial structured domestic addresses for CTC-LOCAL only.
-- The shared template retains the existing address field for CTC-ABROAD.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  next_sections jsonb := '[]'::jsonb;
  next_fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  local_only jsonb := '{"field":"origin","operator":"equals","value":"local"}'::jsonb;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'ctc_issuance'
  for update of t;
  if not found then raise exception 'CTC template not found'; end if;

  if exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'requester_province'
  ) then return; end if;

  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'requester_address'
  ) then raise exception 'CTC requester address not found'; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    next_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' = 'requester_address' then
        next_fields := next_fields || jsonb_build_array(
          jsonb_build_object('key','requester_province','type','text',
            'label','Province / Area','required',true,'philippineAddressLevel','province',
            'helpText','Your current Philippine address. For Metro Manila or independent cities, select the corresponding area.',
            'visibleWhen',local_only),
          jsonb_build_object('key','requester_city','type','text',
            'label','City / Municipality','required',true,'philippineAddressLevel','city',
            'visibleWhen',local_only),
          jsonb_build_object('key','requester_barangay','type','text',
            'label','Barangay','required',true,'philippineAddressLevel','barangay',
            'visibleWhen',local_only),
          jsonb_build_object('key','requester_street','type','text',
            'label','House / Unit No., Street, Subdivision / Sitio / Purok','required',false,
            'visibleWhen',local_only),
          field || '{"visibleWhen":{"field":"origin","operator":"equals","value":"abroad"}}'::jsonb
        );
      else
        next_fields := next_fields || jsonb_build_array(field);
      end if;
    end loop;
    next_sections := next_sections || jsonb_build_array(jsonb_set(section,'{fields}',next_fields));
  end loop;

  next_definition := jsonb_set(target.definition,'{sections}',next_sections);
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=target.id;
end
$$;
