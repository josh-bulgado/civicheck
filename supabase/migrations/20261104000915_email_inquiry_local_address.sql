-- Reuse CTC Local's address controls without its origin condition.
-- Keep older versions so submitted requests retain their original form.
do $$
declare
  target record;
  address_fields jsonb;
  section jsonb;
  field jsonb;
  next_sections jsonb := '[]'::jsonb;
  next_fields jsonb;
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

  if exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'requester_province'
  ) then return; end if;

  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'requester_address'
  ) then raise exception 'Email requester address not found'; end if;

  select jsonb_agg(f - 'visibleWhen' order by position) into address_fields
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id,
    jsonb_array_elements(v.definition->'sections') s,
    jsonb_array_elements(s->'fields') with ordinality as fields(f, position)
  where t.template_key = 'ctc_issuance'
    and f->>'key' in ('requester_province', 'requester_city',
      'requester_barangay', 'requester_street');
  if jsonb_array_length(coalesce(address_fields, '[]'::jsonb)) <> 4 then
    raise exception 'CTC Local address fields must be installed first';
  end if;

  for section in select value from jsonb_array_elements(target.definition->'sections') loop
    next_fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' = 'requester_address' then
        next_fields := next_fields || address_fields;
      else
        next_fields := next_fields || jsonb_build_array(field);
      end if;
    end loop;
    next_sections := next_sections || jsonb_build_array(jsonb_set(section, '{fields}', next_fields));
  end loop;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published',
    jsonb_set(target.definition, '{sections}', next_sections), now())
  returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now()
  where id = target.id;
end
$$;
