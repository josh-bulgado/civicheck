-- Capitalize name and number words in the email inquiry details labels.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  label text;
  word text;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='email_inquiry';
  if not found then raise exception 'Email inquiry template not found'; end if;
  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if section->>'step'='details' and field ? 'label' then
        label := field->>'label';
        foreach word in array array['first','last','name','middle','number'] loop
          label := regexp_replace(label, '\m' || word || '\M', initcap(word), 'gi');
        end loop;
        field := jsonb_set(field,'{label}',to_jsonb(label));
      end if;
      fields := fields || jsonb_build_array(field);
    end loop;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(target.definition,'{sections}',sections);
  if next_definition=target.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end
$$;
