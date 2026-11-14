-- Publish father-name fields without changing historical applications.
do $$
declare
  target record;
  next_definition jsonb;
  next_fields jsonb;
  next_sections jsonb;
  section jsonb;
  published_id uuid;
begin
  for target in
    select t.id,t.template_key,v.definition from public.form_templates t
    join public.form_template_versions v on v.id=t.active_version_id
    where t.template_key in ('birth_ontime','birth_delayed','ctc_issuance')
    for update of t
  loop
    next_sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(target.definition->'sections') loop
      if section->>'key'='details' then
        select coalesce(jsonb_agg(f order by n),'[]'::jsonb) into next_fields
        from jsonb_array_elements(section->'fields') with ordinality x(f,n)
        where f->>'key' not in ('father_name','father_last_name','father_middle_name','father_first_name');
        if target.template_key='ctc_issuance' then
          next_fields := next_fields || '[{"key":"father_name","type":"text","label":"Father''s full name","required":false,"visibleWhen":{"field":"record_type","operator":"equals","value":"birth"}}]'::jsonb;
        else
          next_fields := next_fields || '[
            {"key":"father_last_name","type":"text","label":"Last name","inline":true,"required":true,"visibleWhen":{"field":"marital","operator":"equals","value":"marital"}},
            {"key":"father_middle_name","type":"text","label":"Middle name","inline":true,"required":true,"noneLabel":"No middle name","visibleWhen":{"field":"marital","operator":"equals","value":"marital"}},
            {"key":"father_first_name","type":"text","label":"First name","inline":true,"required":true,"visibleWhen":{"field":"marital","operator":"equals","value":"marital"}},
            {"key":"father_name","type":"text","label":"Father''s full name","required":false,"visibleWhen":{"field":"marital","operator":"equals","value":"non-marital"}}
          ]'::jsonb;
        end if;
        section := jsonb_set(section,'{fields}',next_fields);
      end if;
      next_sections := next_sections || jsonb_build_array(section);
    end loop;
    next_definition := jsonb_set(target.definition,'{sections}',next_sections);
    if next_definition=target.definition then continue; end if;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    select target.id,coalesce(max(version),0)+1,'published',next_definition,now()
    from public.form_template_versions where template_id=target.id returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
  end loop;
end $$;
