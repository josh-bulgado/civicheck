-- Citizen's Charter PDF pages 19-20, service 12 (printed pages 16-17).
-- Conditional and per-page charges use the existing "also payable" breakdown.
update public.services_registry
set fee = 355,
    fee_components = '[
      {"label":"Authentication fee","amount":200,"included":true},
      {"label":"Mailing fee","amount":155,"included":true},
      {"label":"Paternity fee","amount":100,"included":false,"note":"If with paternity, subject to staff verification"},
      {"label":"Certified photocopy from the original by the LCR","amount":5,"included":false,"unit":"page"}
    ]'::jsonb,
    steps_description = array[
      'Submit the petition with complete supporting documents and the required personal appearance. CCRO evaluates the documents, filiation, and the father''s identity, then prepares the Certificate of Registration and annotated birth certificate.',
      'Pay the P355 base fee (P200 authentication and P155 mailing), plus P100 if with paternity and P5 per page for certified photocopies from the original by the LCR. Additional charges are not included in the displayed base fee and are confirmed by staff.',
      'Claim the child''s annotated Certificate of Live Birth; CCRO endorses a copy to PSA for database updating.'
    ]
where service_code = 'RA9255_SURNAME';

update public.service_requirements_metadata
set where_to_secure = case
      when requirement_name ilike '%birth certificate%' then 'LCRO and PSA'
      when requirement_name ilike '%Affidavit%' or requirement_name ilike '%Admission of Paternity%'
        then 'LCRO or any Notary Public'
      else where_to_secure
    end
where service_code = 'RA9255_SURNAME';

-- Publish a new version; keep submitted requests pinned to their original form.
do $$
declare
  template_row record;
  section jsonb;
  field jsonb;
  option_row jsonb;
  options jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into template_row
  from public.service_form_templates b
  join public.form_templates t on t.id = b.template_id
  join public.form_template_versions v on v.id = t.active_version_id
  where b.service_code = 'RA9255_SURNAME';
  if not found then raise exception 'R.A. 9255 template not found'; end if;

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' in ('father_on_record', 'filer_relationship') then
        options := '[]'::jsonb;
        for option_row in select value from jsonb_array_elements(field->'options') loop
          if field->>'key' = 'father_on_record' and option_row->>'value' = 'not_sure' then
            option_row := option_row || $json${"notice":{
              "variant":"warning","title":"Confirm the father's acknowledgment",
              "description":"Check the child's birth certificate before selecting Yes or No. If acknowledgment remains unclear, staff must verify whether an Admission of Paternity is needed before you continue. Not sure does not waive this requirement.",
              "blocksProgress":true
            }}$json$::jsonb;
          elsif field->>'key' = 'filer_relationship' and option_row->>'value' = 'other_relative' then
            option_row := option_row || $json${
              "label":"Another relative (subject to staff verification)",
              "notice":{
                "variant":"warning","title":"Filing authority needs verification",
                "description":"The Charter names the mother/legal guardian or the child for signing and personal appearance according to age. Selecting another relative does not establish authority to file or replace their required personal appearance. Staff must verify your authority.",
                "blocksProgress":false
              }
            }$json$::jsonb;
          end if;
          options := options || jsonb_build_array(option_row);
        end loop;
        field := jsonb_set(field, '{options}', options);
        if field->>'key' = 'filer_relationship' then
          field := field || $json${"helpText":"Personal appearance: mother/legal guardian for ages 0-7; child with notarized attestation of the mother/legal guardian for ages 7-17; child for ages 18 and above. Staff verify filing authority. The Charter lists age 7 in both ranges; staff determine the applicable signing requirement."}$json$::jsonb;
        end if;
      end if;
      fields := fields || jsonb_build_array(field);
    end loop;
    sections := sections || jsonb_build_array(jsonb_set(section, '{fields}', fields));
  end loop;
  next_definition := jsonb_set(template_row.definition, '{sections}', sections);
  if next_definition is distinct from template_row.definition then
    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = template_row.id;
    insert into public.form_template_versions(template_id, version, status, definition, published_at)
    values(template_row.id, next_version, 'published', next_definition, now()) returning id into published_id;
    update public.form_templates set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end if;
end $$;
