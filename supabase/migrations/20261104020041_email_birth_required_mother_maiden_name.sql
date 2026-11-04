-- Use the same required mother's maiden-name field as CTC for birth inquiries.
do $$
declare
  target record;
  mother_field jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  join public.service_form_templates b on b.template_id = t.id
  where b.service_code = 'EMAIL_INQUIRY'
  for update of t;
  if not found then raise exception 'Email inquiry template not found'; end if;

  select f into mother_field
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id,
    jsonb_array_elements(v.definition->'sections') s,
    jsonb_array_elements(s->'fields') f
  where t.template_key = 'ctc_issuance' and f->>'key' = 'mother_maiden_name';
  if mother_field is null then raise exception 'CTC mother maiden name field not found'; end if;
  mother_field := mother_field || '{"required":true}'::jsonb;

  select jsonb_set(target.definition, '{sections}', jsonb_agg(
    jsonb_set(s, '{fields}', (select jsonb_agg(
      case when f->>'key' = 'mother_maiden_name' then mother_field else f end order by fp)
      from jsonb_array_elements(s->'fields') with ordinality as fields(f, fp)))
    order by sp)) into next_definition
  from jsonb_array_elements(target.definition->'sections') with ordinality as sections(s, sp);
  if next_definition = target.definition then return; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now()
  where id = target.id;
end
$$;
