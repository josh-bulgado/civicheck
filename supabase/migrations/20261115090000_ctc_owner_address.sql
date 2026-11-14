-- New CTC applications collect the owner's address, leaving old requests intact.
do $$
declare
  target record;
  address_fields jsonb;
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

  select jsonb_agg(jsonb_set(f, '{key}', to_jsonb(replace(f->>'key', 'requester_', 'owner_'))) order by si, fi)
  into address_fields
  from jsonb_array_elements(target.definition->'sections') with ordinality sections(s, si),
    jsonb_array_elements(s->'fields') with ordinality fields(f, fi)
  where f->>'key' in ('requester_province', 'requester_city', 'requester_barangay', 'requester_street');
  if address_fields is null then return; end if;
  if jsonb_array_length(address_fields) <> 4 then raise exception 'CTC address fields incomplete'; end if;
  if not exists (select 1 from jsonb_array_elements(target.definition->'sections') s
    where s->>'key' = 'details') then raise exception 'CTC owner section not found'; end if;

  select jsonb_set(target.definition, '{sections}', jsonb_agg(
    jsonb_set(s, '{fields}', (
      select coalesce(jsonb_agg(f order by fi), '[]'::jsonb)
      from jsonb_array_elements(s->'fields') with ordinality fields(f, fi)
      where f->>'key' not in ('requester_province', 'requester_city', 'requester_barangay', 'requester_street')
    ) || case when s->>'key' = 'details' then address_fields else '[]'::jsonb end)
    order by si
  )) into next_definition
  from jsonb_array_elements(target.definition->'sections') with ordinality sections(s, si);

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end
$$;
