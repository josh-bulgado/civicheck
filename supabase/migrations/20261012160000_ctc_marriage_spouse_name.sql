-- CTC issuance: identify which marriage record is meant.
--
-- The details step names one person, but a marriage record is filed under two.
-- Someone married twice has two records for the same name, and date/place are
-- optional now, so staff could not tell which was asked for. Ask for the
-- spouse's name when the requested record is a marriage certificate. Birth and
-- death records are unique per person, so they are not asked.
--
-- Published versions are immutable, so this publishes a new version; existing
-- requests keep the version they were submitted against. Idempotent.

do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  anchor_key text;
  spouse_field jsonb;
begin
  spouse_field := $json$
  {
    "key": "spouse_name",
    "type": "text",
    "label": "Spouse's full name",
    "required": true,
    "helpText": "As written on the marriage record. This tells staff which record you mean if the person has more than one marriage.",
    "visibleWhen": { "field": "record_type", "operator": "equals", "value": "marriage" }
  }
  $json$::jsonb;

  select template.id, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'ctc_issuance';

  if not found then
    return;
  end if;

  -- Already asked, or the record type question it hangs off is missing.
  if exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'spouse_name'
  ) or not exists (
    select 1
    from jsonb_array_elements(template_row.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key' = 'record_type'
  ) then
    return;
  end if;

  -- Sit directly under the record type (and its "specify" follow-up).
  anchor_key := case
    when exists (
      select 1
      from jsonb_array_elements(template_row.definition->'sections') s,
        jsonb_array_elements(s->'fields') f
      where f->>'key' = 'record_type_other'
    ) then 'record_type_other'
    else 'record_type'
  end;

  for section in
    select value from jsonb_array_elements(template_row.definition->'sections')
  loop
    if section->>'step' = 'case' then
      new_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        new_fields := new_fields || jsonb_build_array(field);
        if field->>'key' = anchor_key then
          new_fields := new_fields || jsonb_build_array(spouse_field);
        end if;
      end loop;
      section := jsonb_set(section, '{fields}', new_fields, true);
    end if;
    new_sections := new_sections || jsonb_build_array(section);
  end loop;

  next_definition := jsonb_set(
    template_row.definition, '{sections}', new_sections, true
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
end
$$;
