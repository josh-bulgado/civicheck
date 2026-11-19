-- Restore the birth form published before the requester experiment.
-- Keep every published version and any applications using them.
do $$
declare
  target record;
  previous_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='birth_ontime'
  for update of t;
  if not found then raise exception 'On-time birth template not found'; end if;
  if not exists (select 1 from jsonb_array_elements(target.definition->'sections') s
    where s->>'key'='details_requester') then return; end if;

  select v.definition into previous_definition
  from public.form_template_versions v
  where v.template_id=target.id and v.status='published'
    and not exists (select 1 from jsonb_array_elements(v.definition->'sections') s
      where s->>'key'='details_requester')
  order by v.version desc limit 1;
  if previous_definition is null then raise exception 'Original birth form not found'; end if;

  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',previous_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end $$;
