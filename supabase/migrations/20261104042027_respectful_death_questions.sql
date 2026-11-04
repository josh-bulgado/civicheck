-- Use gentler wording without changing answers or document rules.
create or replace function pg_temp.respectful_death_fields(p_fields jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(jsonb_agg(
    case field->>'key'
      when 'died_in_legazpi' then
        field || jsonb_build_object('label', 'Did the person pass away in Legazpi City?')
      when 'disposal_method' then
        field || jsonb_build_object(
          'label', 'Was the deceased person buried or cremated?',
          'helpText', 'This information helps us identify the certificates required for registration.'
        )
      else field
    end order by ord
  ), '[]'::jsonb)
  from jsonb_array_elements(p_fields) with ordinality as fields(field, ord);
$$;

update public.form_field_blocks
set fields = pg_temp.respectful_death_fields(fields),
    version = version + 1,
    updated_at = now()
where block_key = 'death_disposal'
  and fields is distinct from pg_temp.respectful_death_fields(fields);

-- Publish new versions so existing requests keep their original templates.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for target in
    select template.id, version.definition
    from public.form_templates template
    join public.form_template_versions version on version.id = template.active_version_id
    where template.template_key in ('death_ontime', 'death_delayed')
  loop
    select jsonb_set(target.definition, '{sections}', jsonb_agg(
      jsonb_set(section, '{fields}', pg_temp.respectful_death_fields(section->'fields'))
      order by ord
    )) into next_definition
    from jsonb_array_elements(target.definition->'sections')
      with ordinality as sections(section, ord);

    if next_definition is not distinct from target.definition then
      continue;
    end if;

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions
    where template_id = target.id;

    insert into public.form_template_versions (
      template_id, version, status, definition, published_at
    ) values (
      target.id, next_version, 'published', next_definition, now()
    ) returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = target.id;
  end loop;
end
$$;
