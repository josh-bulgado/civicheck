-- Online marriage applications identify which party owns the account.
do $$
declare
  template_row record;
  role_field jsonb;
  next_sections jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for template_row in
    select t.id, t.template_key, v.definition
    from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id
    where t.template_key in ('marriage_license', 'marriage_ontime', 'marriage_delayed')
    for update of t
  loop
    if exists (
      select 1 from jsonb_array_elements(template_row.definition->'sections') s,
        jsonb_array_elements(s->'fields') f where f->>'key' = 'account_party_role'
    ) then continue; end if;

    role_field := jsonb_build_object(
      'key', 'account_party_role', 'type', 'select', 'required', true,
      'label', case when template_row.template_key = 'marriage_license'
        then 'Are you the bride or groom?' else 'Are you the husband or wife?' end,
      'options', jsonb_build_array(
        jsonb_build_object('value', 'Bride', 'label',
          case when template_row.template_key = 'marriage_license' then 'Bride' else 'Wife' end),
        jsonb_build_object('value', 'Groom', 'label',
          case when template_row.template_key = 'marriage_license' then 'Groom' else 'Husband' end)
      )
    );

    -- Insert immediately before the existing details sections.
    select jsonb_agg(section order by section_order) into next_sections
    from (
      select section, section_order * 2 as section_order
      from jsonb_array_elements(template_row.definition->'sections')
        with ordinality as sections(section, section_order)
      union all
      select jsonb_build_object('key', 'details_account_party', 'step', 'details',
        'title', 'Your role', 'fields', jsonb_build_array(role_field)),
        (select min(n) * 2 - 1 from jsonb_array_elements(template_row.definition->'sections')
          with ordinality as sections(s, n) where s->>'step' = 'details')
    ) sections;

    next_definition := jsonb_set(template_row.definition, '{sections}', next_sections);
    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = template_row.id;

    insert into public.form_template_versions
      (template_id, version, status, definition, published_at)
    values (template_row.id, next_version, 'published', next_definition, now())
    returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end loop;
end
$$;
