-- Put the follow-up question directly under the choice that reveals it.
--
-- "Do the couple have children?" only appears for reconstruction, but it was
-- appended after the date and place fields, so it showed up detached from the
-- "What do you need to register?" answer that triggered it. Move it to sit
-- right after registration_type.
--
-- Published versions are immutable, so this publishes a new version.
-- Idempotent: does nothing when the field is already directly after its trigger.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select template.id, version.definition
  into target
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'marriage_delayed';

  if found and exists (
    select 1
    from jsonb_array_elements(target.definition->'sections') section,
      lateral (
        select
          max(ord) filter (where fld->>'key' = 'registration_type') as trigger_ord,
          max(ord) filter (where fld->>'key' = 'has_children') as child_ord
        from jsonb_array_elements(section->'fields')
          with ordinality as fields(fld, ord)
      ) positions
    where section->>'step' = 'case'
      and positions.child_ord is not null
      and positions.trigger_ord is not null
      and positions.child_ord <> positions.trigger_ord + 1
  ) then
    select jsonb_set(
      target.definition,
      '{sections}',
      jsonb_agg(
        case when section->>'step' = 'case' then
          jsonb_set(
            section,
            '{fields}',
            (
              select jsonb_agg(item.field order by item.sort_key)
              from (
                select
                  f.field,
                  case when f.field->>'key' = 'has_children' then
                    (
                      select o.ord + 0.5
                      from jsonb_array_elements(section->'fields')
                        with ordinality as o(fld, ord)
                      where o.fld->>'key' = 'registration_type'
                    )
                  else f.ord end as sort_key
                from jsonb_array_elements(section->'fields')
                  with ordinality as f(field, ord)
              ) item
            ),
            true
          )
        else section end
        order by section_ordinality
      ),
      true
    )
    into next_definition
    from jsonb_array_elements(target.definition->'sections')
      with ordinality as sections(section, section_ordinality);

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
  end if;
end
$$;
