-- Structured international addresses for CTC-ABROAD; Local remains unchanged.
-- Publish a new version so previous requests retain their original definitions.
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
  abroad_only jsonb := '{"field":"origin","operator":"equals","value":"abroad"}'::jsonb;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ctc_issuance'
  for update of t;
  if not found then raise exception 'CTC template not found'; end if;
  if exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key'='requester_country'
  ) then return; end if;
  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key'='requester_address'
  ) then raise exception 'CTC address field not found'; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    next_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key'='requester_address' then
        next_fields := next_fields || jsonb_build_array(
          jsonb_build_object('key','requester_country','type','text','label','Country',
            'required',true,'countrySelect',true,
            'helpText','Enter your current address, wherever you live.',
            'visibleWhen',abroad_only),
          jsonb_build_object('key','requester_address_line1','type','text','label','Address line 1',
            'required',true,'placeholder','House / building number and street',
            'visibleWhen',abroad_only),
          jsonb_build_object('key','requester_address_line2','type','text','label','Address line 2',
            'required',false,'placeholder','Apartment, unit, building or district',
            'visibleWhen',abroad_only),
          jsonb_build_object('key','requester_overseas_city','type','text','label','City / Town',
            'required',true,'visibleWhen',abroad_only),
          jsonb_build_object('key','requester_overseas_region','type','text','label','State / Province / Region',
            'required',false,'visibleWhen',abroad_only),
          jsonb_build_object('key','requester_postal_code','type','text','label','Postal code',
            'required',false,'visibleWhen',abroad_only)
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
