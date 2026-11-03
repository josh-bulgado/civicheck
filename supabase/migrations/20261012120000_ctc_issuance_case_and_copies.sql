-- Certified True/Xerox Copies of Civil Registry Records (CTC-LOCAL / CTC-ABROAD).
--
-- 1. The two variants are one display group (`ctc_issuance`) whose published
--    form template had no case selector, so the apply wizard silently resolved
--    the group to its first variant (CTC-ABROAD) and never asked. Ask where the
--    request originates and route to the matching service.
-- 2. The case step did not say which record is wanted or whether the requester
--    owns it. Add both, and require the Authorization Letter / Affidavit of
--    Kinship only when the requester is not the document owner.
-- 3. The charter fee (Local 100.00 / Abroad 200.00) is per copy. Add a
--    quantity to requests and flag the services whose fee scales with it.
--
-- Everything is idempotent so it can be re-run safely.

-- 1. Quantity ----------------------------------------------------------------

alter table public.requests
  add column if not exists copies integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'requests_copies_range'
      and conrelid = 'public.requests'::regclass
  ) then
    alter table public.requests
      add constraint requests_copies_range check (copies between 1 and 10);
  end if;
end
$$;

comment on column public.requests.copies is
  'Number of copies requested. Always 1 unless the service is fee_per_copy; fees_due already includes the multiplier.';

alter table public.services_registry
  add column if not exists fee_per_copy boolean not null default false;

comment on column public.services_registry.fee_per_copy is
  'When true, fee is charged per copy and the applicant chooses a quantity (fees_due = fee * copies).';

update public.services_registry
set fee_per_copy = true
where service_code in ('CTC-LOCAL', 'CTC-ABROAD');

-- 2. Case selector + case-step fields ---------------------------------------

do $$
declare
  template_row record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  selector jsonb;
  leading_fields jsonb;
  relationship_field jsonb;
  section jsonb;
  field jsonb;
  new_sections jsonb := '[]'::jsonb;
  new_fields jsonb;
  relationship_placed boolean;
begin
  selector := $json$
  {
    "title": "Where is this request coming from?",
    "description": "The fee depends on whether the request originates in the Philippines or abroad.",
    "questions": [{
      "key": "origin",
      "label": "Where is this request coming from?",
      "options": [
        { "value": "local", "label": "Within the Philippines (Local)" },
        { "value": "abroad", "label": "From abroad" }
      ]
    }],
    "outcomes": [
      { "serviceCode": "CTC-LOCAL", "when": { "match": "all", "conditions": [
        { "field": "origin", "operator": "equals", "value": "local" }
      ] } },
      { "serviceCode": "CTC-ABROAD", "when": { "match": "all", "conditions": [
        { "field": "origin", "operator": "equals", "value": "abroad" }
      ] } }
    ]
  }
  $json$::jsonb;

  leading_fields := $json$
  [
    {
      "key": "record_type",
      "type": "select",
      "label": "Type of record requested",
      "required": true,
      "options": [
        { "value": "birth", "label": "Birth Certificate" },
        { "value": "marriage", "label": "Marriage Certificate" },
        { "value": "death", "label": "Death Certificate" },
        { "value": "other", "label": "Other civil registry record" }
      ]
    },
    {
      "key": "record_type_other",
      "type": "text",
      "label": "Specify the record",
      "required": true,
      "visibleWhen": { "field": "record_type", "operator": "equals", "value": "other" }
    }
  ]
  $json$::jsonb;

  relationship_field := $json$
  {
    "key": "requester_relationship",
    "type": "select",
    "label": "Your relationship to the document owner",
    "required": true,
    "helpText": "If you are not the document owner, you must upload an Authorization Letter from the owner or an Affidavit of Kinship.",
    "options": [
      { "value": "owner", "label": "I am the document owner" },
      { "value": "representative", "label": "Authorized representative" },
      { "value": "kin", "label": "Immediate family / next of kin" }
    ]
  }
  $json$::jsonb;

  select template.id, template.template_key, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'ctc_issuance';

  if found
     and (template_row.definition->'caseSelector' is null
          or not exists (
            select 1
            from jsonb_array_elements(template_row.definition->'sections') s,
              jsonb_array_elements(s->'fields') f
            where f->>'key' = 'record_type'
          ))
  then
    for section in
      select value from jsonb_array_elements(template_row.definition->'sections')
    loop
      if section->>'step' = 'case'
         and not exists (
           select 1 from jsonb_array_elements(section->'fields') f
           where f->>'key' = 'record_type'
         )
      then
        -- Record type first, then the existing fields, with the relationship
        -- question just ahead of "Purpose of request".
        new_fields := leading_fields;
        relationship_placed := false;
        for field in select value from jsonb_array_elements(section->'fields') loop
          if field->>'key' = 'purpose' and not relationship_placed then
            new_fields := new_fields || jsonb_build_array(relationship_field);
            relationship_placed := true;
          end if;
          new_fields := new_fields || jsonb_build_array(field);
        end loop;
        if not relationship_placed then
          new_fields := new_fields || jsonb_build_array(relationship_field);
        end if;
        section := jsonb_set(section, '{fields}', new_fields, true);
      end if;
      new_sections := new_sections || jsonb_build_array(section);
    end loop;

    next_definition := jsonb_set(
      jsonb_set(template_row.definition, '{sections}', new_sections, true),
      '{caseSelector}',
      selector,
      true
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

-- 3. Authorization Letter / Affidavit of Kinship only for non-owners ---------
--    Mandatory so the documents step renders it as an upload slot whenever the
--    rule matches (the step lists mandatory + applicable requirements only).

update public.service_requirements_metadata
set is_mandatory = true,
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'requester_relationship',
        'operator', 'not_equals',
        'value', 'owner'
      ))
    )
where requirement_group = 'ctc_issuance'
  and requirement_name ilike 'Authorization%';
