-- Require the requester address on new email inquiry submissions.
do $$
declare
  target record;
  sections jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='email_inquiry';
  if not found then raise exception 'Email inquiry template not found'; end if;
  select jsonb_agg(jsonb_set(s,'{fields}',(
    select jsonb_agg(case when f->>'key'='requester_address'
      then jsonb_set(f,'{required}','true'::jsonb) else f end order by fp)
    from jsonb_array_elements(s->'fields') with ordinality as fields(f,fp)
  )) order by sp) into sections
  from jsonb_array_elements(target.definition->'sections') with ordinality as sections(s,sp);
  next_definition := jsonb_set(target.definition,'{sections}',sections);
  if next_definition=target.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end
$$;
