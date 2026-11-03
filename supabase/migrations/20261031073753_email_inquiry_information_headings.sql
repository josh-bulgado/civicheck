-- Capitalize Information in all email inquiry section headings.
do $$
declare
  target record; next_definition jsonb; next_version integer; published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='email_inquiry';
  if not found then raise exception 'Email inquiry template not found'; end if;
  select jsonb_set(target.definition,'{sections}',jsonb_agg(
    case when s ? 'title' then jsonb_set(s,'{title}',
      to_jsonb(regexp_replace(s->>'title','\minformation\M','Information','gi')))
    else s end order by n)) into next_definition
  from jsonb_array_elements(target.definition->'sections') with ordinality as items(s,n);
  if next_definition=target.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end
$$;
