-- Require marriage details so CCRO can locate the CTC record.
-- Publish a new version to preserve existing submissions.
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
    jsonb_set(s.value, '{fields}', (
      select jsonb_agg(
        case
          when f.value->>'key' in ('marriage_date', 'marriage_place')
            then jsonb_set(f.value, '{required}', 'true'::jsonb)
          else f.value
        end order by f.position
      )
      from jsonb_array_elements(s.value->'fields') with ordinality as f(value, position)
    )) order by s.position
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
