-- Citizen's Charter 2025, PDF pages 16-19. Online requests remain subject to
-- staff verification of originals, completeness, and filing-fee exemptions.
update public.service_requirements_metadata
set requirement_name = '[Change of First Name] At least 3 supporting documents (e.g. baptismal certificate, school records, government IDs, marriage certificate, children''s COLB, BIR/SSS/Pag-IBIG record, passbook), 2 original/certified photocopies of each'
where requirement_group = 'ra9048_10172'
  and requirement_name like '[Change of First Name] At least 3%';

update public.service_requirements_metadata
set requirement_name = '[RA 10172 Sex/DOB Correction] Clearance/certification of no pending administrative, civil or criminal case or criminal record: employer certification if employed, or affidavit of non-employment/self-employment; plus NBI and PNP clearances'
where requirement_group = 'ra9048_10172'
  and requirement_name like '[RA 10172 Sex/DOB Correction] Clearance/certification%';

update public.service_requirements_metadata
set where_to_secure = case
  when requirement_name like '%Child''s Certificate%' then 'PSA / Local Civil Registrar'
  when requirement_name like '%NBI and Police%' then 'NBI / PNP'
  when requirement_name like '%Employer''s Certification%' then 'Applicant''s employer'
  when requirement_name like '%Affidavit of Non-Employment%' then 'Law Office'
  when requirement_name like '%Newspaper clippings%' or requirement_name like '%Affidavit of Publication%' then 'Local newspaper publisher'
  when requirement_name like '%At least 3%' or requirement_name like '%Personal documents%' then 'Church / School / LTO / PSA / LCR / BIR / SSS / Pag-IBIG / Bank'
  when requirement_name like '%Earliest school%' then 'School'
  when requirement_name like '%Medical record%' then 'Hospital / Physician'
  when requirement_name like '%Baptismal certificate, or%' then 'Church'
  when requirement_name like '%Clearance/certification%' then 'Employer / Law Office / NBI / PNP'
  when requirement_name like '%Notice and Certificate%' then 'Local Civil Registrar'
  when requirement_name like '%Certification from the City%' then 'Government Health Officer'
  when requirement_name like '%Additional supporting%' then null
  else 'PSA / Local Civil Registrar'
end
where requirement_group = 'ra9048_10172';

insert into public.service_requirements_metadata
  (requirement_group, requirement_name, is_mandatory, requires_upload, sort_order, applies_when)
select 'ra9048_10172', 'Certificate of Indigency for filing-fee exemption, subject to staff verification',
  true, true, 21,
  '{"match":"all","conditions":[{"field":"filing_fee_exemption","operator":"equals","value":"yes"}]}'::jsonb
where not exists (
  select 1 from public.service_requirements_metadata
  where requirement_group = 'ra9048_10172' and requirement_name like 'Certificate of Indigency%'
);

do $$
declare
  template_row record;
  next_definition jsonb;
  section jsonb;
  field jsonb;
  fields jsonb;
  sections jsonb := '[]'::jsonb;
  published_id uuid;
  next_version integer;
begin
  select t.id, v.definition into template_row
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'ra9048_10172';
  if not found then raise exception 'Petition template not found'; end if;

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    fields := '[]'::jsonb;
    for field in select value from jsonb_array_elements(section->'fields') loop
      if field->>'key' = 'petitioner_relationship' then
        field := field || '{"helpText":"Staff will verify your authority to file. Selecting a relationship or authorized representative does not establish eligibility."}'::jsonb;
      end if;
      fields := fields || jsonb_build_array(field);
    end loop;
    if section->>'step' = 'case' and not exists (
      select 1 from jsonb_array_elements(fields) f where f->>'key' = 'filing_fee_exemption'
    ) then
      fields := fields || $json$[{
        "key":"filing_fee_exemption","type":"select","label":"Are you requesting a filing-fee exemption with a Certificate of Indigency?","required":true,
        "helpText":"The Charter exempts petitioners with a Certificate of Indigency from the filing fee only. Other applicable charges remain payable. The displayed fee remains the standard fee pending staff verification.",
        "options":[{"value":"yes","label":"Yes, I will submit a Certificate of Indigency"},{"value":"no","label":"No"}]
      }]$json$::jsonb;
    end if;
    sections := sections || jsonb_build_array(jsonb_set(section, '{fields}', fields));
  end loop;
  next_definition := jsonb_set(template_row.definition, '{sections}', sections);
  next_definition := jsonb_set(next_definition, '{caseSelector,description}',
    to_jsonb('Answer each question; at least one must be Yes. Online submission is for staff review. Staff must verify all applicable requirements before accepting the petition. Publication documents are submitted later, as described in the service steps.'::text));
  if next_definition is distinct from template_row.definition then
    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = template_row.id;
    insert into public.form_template_versions(template_id, version, status, definition, published_at)
    values(template_row.id, next_version, 'published', next_definition, now()) returning id into published_id;
    update public.form_templates set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end if;
end $$;
