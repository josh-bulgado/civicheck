-- Reuse the CTC requester fields for the generated email verification form.
-- Publish a new version so submitted requests retain their original schema.
do $$
declare
  target record;
  requester_fields jsonb;
  next_definition jsonb;
  published_id uuid;
  next_version integer;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  join public.service_form_templates b on b.template_id = t.id
  where b.service_code = 'EMAIL_INQUIRY';
  if not found then return; end if;

  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'requester_first_name'
  ) then
    select jsonb_agg(f order by array_position(array[
      'requester_first_name', 'requester_middle_name', 'requester_last_name',
      'requester_address'
    ], f->>'key')) into requester_fields
    from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id,
      jsonb_array_elements(v.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where t.template_key = 'ctc_issuance'
      and f->>'key' in ('requester_first_name', 'requester_middle_name',
        'requester_last_name', 'requester_address');
    if requester_fields is null then
      raise exception 'CTC requester fields must be installed first';
    end if;

    next_definition := jsonb_set(target.definition, '{sections}',
      (select jsonb_agg(s order by position) from (
        select s, position from jsonb_array_elements(target.definition->'sections')
          with ordinality as sections(s, position)
        union all
        select jsonb_build_object(
          'key', 'details_requester', 'step', 'details',
          'title', 'Requester''s information', 'singleColumn', true,
          'fields', requester_fields
        ), 0
      ) ordered_sections));
    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = target.id;
    insert into public.form_template_versions
      (template_id, version, status, definition, published_at)
    values (target.id, next_version, 'published', next_definition, now())
    returning id into published_id;
    update public.form_templates set active_version_id = published_id,
      updated_at = now() where id = target.id;
  end if;
end
$$;

-- The form is generated after submission, just like the CTC form.
update public.service_requirements_metadata
set requirement_name = 'Verification Form: we fill it in for you. Print it and sign it at the CCRO.',
    requires_upload = false,
    upload_scope = 'request'
where (service_code = 'EMAIL_INQUIRY' or requirement_group = 'EMAIL_INQUIRY')
  and requirement_name ilike 'Verification Form%';
