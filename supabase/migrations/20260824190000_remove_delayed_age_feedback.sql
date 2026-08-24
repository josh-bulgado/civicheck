-- Keep delayed-registration age derivation for routing, but do not show an
-- informational notice when the calculated track requires no applicant action.

do $$
declare
  template_row record;
  current_definition jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  derived_rules jsonb;
begin
  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'birth_delayed';

  if found and exists (
    select 1
    from jsonb_array_elements(
      coalesce(template_row.definition->'derivedAnswers', '[]'::jsonb)
    ) derived,
      jsonb_array_elements(coalesce(derived->'bands', '[]'::jsonb)) band
    where derived->>'key' = 'age' and band ? 'notice'
  ) then
    current_definition := template_row.definition;

    select jsonb_agg(
      case when derived->>'key' = 'age' then
        derived || jsonb_build_object(
          'bands', (
            select jsonb_agg(band - 'notice')
            from jsonb_array_elements(derived->'bands') band
          )
        )
      else derived end
    )
    into derived_rules
    from jsonb_array_elements(current_definition->'derivedAnswers') derived;

    next_definition := jsonb_set(
      current_definition, '{derivedAnswers}', derived_rules, true
    );

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
  end if;
end
$$;
