-- Contact information belongs to the requester, not the record owner.
do $$
declare
  target record; section jsonb; sections jsonb := '[]'::jsonb;
  contact jsonb; fields jsonb; next_definition jsonb;
  next_version integer; published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='email_inquiry';
  if not found then raise exception 'Email inquiry template not found'; end if;
  select f into contact from jsonb_array_elements(target.definition->'sections') s,
    jsonb_array_elements(s->'fields') f where f->>'key'='contact_number' limit 1;
  if contact is null then raise exception 'Contact field not found'; end if;
  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    select coalesce(jsonb_agg(f order by n),'[]'::jsonb) into fields
    from jsonb_array_elements(section->'fields') with ordinality as items(f,n)
    where f->>'key'<>'contact_number';
    if section->>'key'='details_requester' then fields := fields || jsonb_build_array(contact); end if;
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
