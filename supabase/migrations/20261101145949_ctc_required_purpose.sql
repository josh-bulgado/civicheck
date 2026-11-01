-- Require a purpose and an explanation when Other is selected.
-- Publish a new version so existing submissions keep their original template.
do $$
declare
  template_row record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into template_row
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'ctc_issuance'
  for update of t;

  if not found then
    return;
  end if;

  select jsonb_set(template_row.definition, '{sections}', jsonb_agg(
    case when s.value->>'key' = 'details_requester' then
      jsonb_set(s.value, '{fields}', (
        select jsonb_agg(updated.field order by updated.position, updated.extra)
        from (
          select
            case when f.value->>'key' = 'purpose_of_request' then
              (f.value - 'placeholder') || jsonb_build_object(
                'type', 'select', 'required', true,
                'options', jsonb_build_array(
                  jsonb_build_object('value', 'Local Use (ID, Barangay, etc.)', 'label', 'Local Use (ID, Barangay, etc.)'),
                  jsonb_build_object('value', 'Employment', 'label', 'Employment'),
                  jsonb_build_object('value', 'Passport / Travel', 'label', 'Passport / Travel'),
                  jsonb_build_object('value', 'School Records / Admission', 'label', 'School Records / Admission'),
                  jsonb_build_object('value', 'Social Security (SSS/GSIS/etc.)', 'label', 'Social Security (SSS/GSIS/etc.)'),
                  jsonb_build_object('value', 'Legal / Court proceedings', 'label', 'Legal / Court proceedings'),
                  jsonb_build_object('value', 'Other', 'label', 'Other')
                )
              )
            else f.value end as field, f.position, 0 as extra
          from jsonb_array_elements(s.value->'fields') with ordinality as f(value, position)
          where f.value->>'key' <> 'purpose_of_request_other'
          union all
          select jsonb_build_object(
            'key', 'purpose_of_request_other', 'type', 'text',
            'label', 'Specify purpose', 'required', true,
            'visibleWhen', jsonb_build_object(
              'field', 'purpose_of_request', 'operator', 'equals', 'value', 'Other'
            )
          ), f.position, 1
          from jsonb_array_elements(s.value->'fields') with ordinality as f(value, position)
          where f.value->>'key' = 'purpose_of_request'
        ) updated
      ))
    else s.value end order by s.position
  )) into next_definition
  from jsonb_array_elements(template_row.definition->'sections')
    with ordinality as s(value, position);

  if next_definition = template_row.definition then
    return;
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions
  where template_id = template_row.id;

  insert into public.form_template_versions (
    template_id, version, status, definition, published_at
  ) values (
    template_row.id, next_version, 'published', next_definition, now()
  ) returning id into published_id;

  update public.form_templates
  set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end
$$;
