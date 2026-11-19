-- Remove duplicate consent notices; age bands and checklist rules stay intact.
do $$
declare
  template_row record;
  next_rules jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into template_row
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'marriage_license'
  for update of t;
  if not found then
    raise exception 'Active marriage-license template not found';
  end if;

  select jsonb_agg(
    case when rule->>'key' in ('bride_age_bracket', 'groom_age_bracket') then
      jsonb_set(rule, '{bands}', (
        select jsonb_agg(
          case when band->>'value' = '18_20' then band - 'notice' else band end
          order by band_order
        )
        from jsonb_array_elements(rule->'bands')
          with ordinality as bands(band, band_order)
      ))
    else rule end order by rule_order
  ) into next_rules
  from jsonb_array_elements(template_row.definition->'derivedAnswers')
    with ordinality as rules(rule, rule_order);

  next_definition := jsonb_set(template_row.definition, '{derivedAnswers}', next_rules);
  if next_definition = template_row.definition then return; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = template_row.id;

  insert into public.form_template_versions
    (template_id, version, status, definition, published_at)
  values (template_row.id, next_version, 'published', next_definition, now())
  returning id into published_id;

  update public.form_templates
  set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end
$$;
