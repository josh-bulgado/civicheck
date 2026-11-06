-- Keep the death fields in Details without a separate section heading.
do $$
declare
  target record;
  event_fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='death_ontime' for update of t;
  if not found then raise exception 'On-time death template not found'; end if;
  select s->'fields' into event_fields from jsonb_array_elements(target.definition->'sections') s
  where s->>'key'='death_event_details';
  if event_fields is null then return; end if;
  select jsonb_set(target.definition,'{sections}',jsonb_agg(
    case when s->>'key'='details' then jsonb_set(s,'{fields}',(s->'fields')||event_fields)
    else s end order by si
  )) into next_definition
  from jsonb_array_elements(target.definition->'sections') with ordinality sections(s,si)
  where s->>'key'<>'death_event_details';
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end $$;
