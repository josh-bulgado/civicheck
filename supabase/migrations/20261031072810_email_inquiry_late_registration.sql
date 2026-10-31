-- Reuse CTC late-registration fields in email inquiry owner's details.
do $$
declare
  target record; late_fields jsonb; sections jsonb; next_definition jsonb;
  next_version integer; published_id uuid;
begin
  select t.id,v.definition into target from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='email_inquiry';
  if not found then raise exception 'Email inquiry template not found'; end if;
  if exists(select 1 from jsonb_array_elements(target.definition->'sections') s,
    jsonb_array_elements(s->'fields') f where f->>'key'='registered_late') then return; end if;
  select jsonb_agg(
    case when f->>'key'='registered_late'
      then (f - 'visibleWhen') || jsonb_build_object('label','Registered Late?')
      else f end
    order by case when f->>'key'='registered_late' then 0 else 1 end)
  into late_fields from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id,
    jsonb_array_elements(v.definition->'sections') s,jsonb_array_elements(s->'fields') f
  where t.template_key='ctc_issuance' and f->>'key' in ('registered_late','registered_late_when');
  if jsonb_array_length(late_fields) is distinct from 2 then raise exception 'CTC late-registration fields missing'; end if;
  select jsonb_agg(case when s->>'key'='details'
    then jsonb_set(s,'{fields}',(s->'fields') || late_fields) else s end order by n)
  into sections from jsonb_array_elements(target.definition->'sections') with ordinality as items(s,n);
  next_definition := jsonb_set(target.definition,'{sections}',sections);
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end
$$;
