-- Marriage inquiries collect both spouses independently of the requester name.
-- Publish a new version; existing submissions keep their original answers.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  published_id uuid;
  next_version integer;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='email_inquiry';
  if not found then raise exception 'Email inquiry template not found'; end if;
  if exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f where f->>'key'='wife_maiden_name'
  ) then return; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key'='subjects' then
        field := field || jsonb_build_object('labelByAnswer', jsonb_build_object(
          'field','record_type','labels',jsonb_build_object('marriage','Name of husband')
        ));
        fields := fields || jsonb_build_array(field, jsonb_build_object(
          'key','wife_maiden_name','type','text','label','Maiden name of wife',
          'required',true,'visibleWhen',jsonb_build_object(
            'field','record_type','operator','equals','value','marriage'
          )
        ));
      else
        fields := fields || jsonb_build_array(field);
      end if;
    end loop;
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',jsonb_set(target.definition,'{sections}',sections),now())
  returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=target.id;
end
$$;
