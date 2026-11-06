-- Both CTC variants collect the requester's Philippine address.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'ctc_issuance'
  for update of t;
  if not found then raise exception 'CTC template not found'; end if;
  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f where f->>'key' = 'requester_province'
  ) then raise exception 'CTC Philippine address fields not found'; end if;

  select jsonb_set(target.definition, '{sections}', jsonb_agg(
    jsonb_set(s, '{fields}', (
      select coalesce(jsonb_agg(case when f->>'key' in (
        'requester_province', 'requester_city', 'requester_barangay', 'requester_street'
      ) then f - 'visibleWhen' else f end order by fi), '[]'::jsonb)
      from jsonb_array_elements(s->'fields') with ordinality as fields(f, fi)
      where f->>'key' not in ('requester_country', 'requester_address_line1',
        'requester_address_line2', 'requester_overseas_city', 'requester_overseas_region',
        'requester_postal_code', 'requester_address')
    )) order by si
  )) into next_definition
  from jsonb_array_elements(target.definition->'sections') with ordinality as sections(s, si);
  if next_definition = target.definition then return; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end
$$;
