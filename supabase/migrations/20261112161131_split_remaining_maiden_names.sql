-- Split existing maiden-name questions only; retain old published versions.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  part text;
  prefix text;
  name_field jsonb;
  fields jsonb;
  sections jsonb;
  definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for template_row in
    select t.id,v.definition from public.form_templates t
    join public.form_template_versions v on v.id=t.active_version_id
    where exists (
      select 1 from jsonb_array_elements(v.definition->'sections') s,
        jsonb_array_elements(s->'fields') f
      where f->>'key' in ('wife_maiden_name','mother_maiden_name')
    )
  loop
    sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
      fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('wife_maiden_name','mother_maiden_name') then
          prefix := split_part(field->>'key','_',1);
          foreach part in array array['first','middle','last'] loop
            name_field := (field - 'placeholder' - 'helpText' - 'blockKey' - 'noneLabel') || jsonb_build_object(
              'key',prefix || '_' || part || '_name',
              'label',initcap(prefix) || case part when 'first' then '''s first name' when 'middle' then '''s maiden middle name' else '''s maiden last name' end,
              'inline',true
            );
            if part='middle' then name_field := name_field || '{"noneLabel":"No middle name"}'::jsonb; end if;
            fields := fields || jsonb_build_array(name_field);
          end loop;
        else fields := fields || jsonb_build_array(field);
        end if;
      end loop;
      sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
    end loop;
    definition := jsonb_set(template_row.definition,'{sections}',sections);
    select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=template_row.id;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    values(template_row.id,next_version,'published',definition,now()) returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=template_row.id;
  end loop;
end
$$;
