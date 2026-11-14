-- Restore the requester's address for new CTC applications.
do $$
declare
  target record;
  address_fields jsonb;
  section jsonb;
  field jsonb;
  next_fields jsonb;
  next_sections jsonb := '[]'::jsonb;
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

  select jsonb_agg(jsonb_set(f, '{key}', to_jsonb(replace(f->>'key', 'owner_', 'requester_'))) order by si, fi)
  into address_fields
  from jsonb_array_elements(target.definition->'sections') with ordinality sections(s, si),
    jsonb_array_elements(s->'fields') with ordinality fields(f, fi)
  where f->>'key' in ('owner_province', 'owner_city', 'owner_barangay', 'owner_street');
  if address_fields is null then return; end if;
  if jsonb_array_length(address_fields) <> 4 then raise exception 'CTC address fields incomplete'; end if;
  if not exists (select 1 from jsonb_array_elements(target.definition->'sections') s,
    jsonb_array_elements(s->'fields') f where s->>'key' = 'details_requester'
      and f->>'key' = 'purpose_of_request') then raise exception 'CTC requester section not found'; end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    next_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if section->>'key' = 'details_requester' and field->>'key' = 'purpose_of_request' then
        next_fields := next_fields || address_fields;
      end if;
      if field->>'key' not in ('owner_province', 'owner_city', 'owner_barangay', 'owner_street') then
        next_fields := next_fields || jsonb_build_array(field);
      end if;
    end loop;
    next_sections := next_sections || jsonb_build_array(jsonb_set(section, '{fields}', next_fields));
  end loop;
  next_definition := jsonb_set(target.definition, '{sections}', next_sections);
  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end
$$;
