-- Reuse the existing marriage-record name fields for clerical petitions.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  fields jsonb;
  wife_fields jsonb;
  sections jsonb := '[]';
  definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ra9048_10172' for update of t;
  if not found then raise exception 'Petition template not found'; end if;
  select jsonb_agg(f order by case f->>'key' when 'wife_first_name' then 1 when 'wife_middle_name' then 2 else 3 end)
  into wife_fields from public.service_form_templates b
  join public.form_templates t on t.id=b.template_id
  join public.form_template_versions v on v.id=t.active_version_id,
    jsonb_array_elements(v.definition->'sections') s,jsonb_array_elements(s->'fields') f
  where b.service_code='OTHER_CERT' and f->>'key' in ('wife_first_name','wife_middle_name','wife_last_name');
  if jsonb_array_length(wife_fields) is distinct from 3 then raise exception 'Marriage reference fields not found'; end if;
  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    if section->>'step'='details' then
      fields := '[]';
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' in ('wife_first_name','wife_middle_name','wife_last_name') then continue; end if;
        fields := fields || jsonb_build_array(field);
        if field->>'key'='subjects' then fields := fields || wife_fields; end if;
      end loop;
      section := jsonb_set(section,'{fields}',fields);
    end if;
    sections := sections || jsonb_build_array(section);
  end loop;
  definition := jsonb_set(target.definition,'{sections}',sections);
  if definition=target.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end $$;
