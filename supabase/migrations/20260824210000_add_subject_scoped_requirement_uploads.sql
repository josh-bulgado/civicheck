-- A requirement can be an in-person instruction, a single request-level
-- upload, or a separate upload for one/every person named in the application.
alter table public.service_requirements_metadata
  add column requires_upload boolean not null default true,
  add column upload_scope text not null default 'request',
  add column subject_role text;

alter table public.service_requirements_metadata
  add constraint service_requirements_upload_scope_check
    check (upload_scope in ('request', 'each_subject', 'specific_subject')),
  add constraint service_requirements_subject_role_check
    check (
      (upload_scope = 'specific_subject' and nullif(btrim(subject_role), '') is not null)
      or (upload_scope <> 'specific_subject' and subject_role is null)
    );

comment on column public.service_requirements_metadata.requires_upload is
  'Whether the applicant must upload a file for this checklist item.';
comment on column public.service_requirements_metadata.upload_scope is
  'request: one shared file; each_subject: one file per application party; specific_subject: one file for subject_role.';
comment on column public.service_requirements_metadata.subject_role is
  'Party role that owns a specific_subject upload, matching services_registry.party_roles.';

alter table public.requirements_attachments
  add column requirement_id uuid references public.service_requirements_metadata(id) on delete set null,
  add column subject_role text;

comment on column public.requirements_attachments.requirement_id is
  'Requirement metadata row that defined this upload. Nullable for historical attachments.';
comment on column public.requirements_attachments.subject_role is
  'Application party this file belongs to; null means the document is shared by the request.';

create index requirements_attachments_requirement_subject_idx
  on public.requirements_attachments (request_id, requirement_id, subject_role);

-- Marriage License: the three identity/civil-registry documents are required
-- separately from both applicants.
update public.service_requirements_metadata
set upload_scope = 'each_subject'
where service_code = 'MARRIAGE_LICENSE'
  and (
    requirement_name ilike 'Birth certificate,%'
    or requirement_name ilike 'CENOMAR,%'
    or requirement_name ilike 'Valid ID,%'
  );

-- Personal appearance remains a mandatory checklist instruction, but it is
-- something applicants complete at CCRO rather than a file they upload.
update public.service_requirements_metadata
set requires_upload = false
where service_code = 'MARRIAGE_LICENSE'
  and requirement_name ilike 'Mandatory personal appearance%';

-- Split each conditional marriage document into a Bride row and Groom row.
-- This preserves which applicant triggered and owns the requirement when only
-- one (or both) matches the age, nationality, or civil-status condition.
do $$
declare
  rule record;
  source_row public.service_requirements_metadata%rowtype;
begin
  for rule in
    select * from (values
      ('Consent,%', 'bride_age_bracket', 'groom_age_bracket', '18_20'),
      ('Parental Advice,%', 'bride_age_bracket', 'groom_age_bracket', '21_24'),
      ('Death Certificate of spouse,%', 'bride_civil_status', 'groom_civil_status', 'widowed'),
      ('Legal Capacity to Marry,%', 'bride_nationality', 'groom_nationality', 'foreign'),
      ('Original/Certified True Copy of Judicial Decree%', 'bride_civil_status', 'groom_civil_status', 'annulled_divorced')
    ) as rules(name_pattern, bride_field, groom_field, answer_value)
  loop
    select * into source_row
    from public.service_requirements_metadata
    where service_code = 'MARRIAGE_LICENSE'
      and requirement_name ilike rule.name_pattern
      and subject_role is null
    order by id
    limit 1;

    if found then
      update public.service_requirements_metadata
      set upload_scope = 'specific_subject',
          subject_role = 'Bride',
          applies_when = jsonb_build_object(
            'match', 'all',
            'conditions', jsonb_build_array(jsonb_build_object(
              'field', rule.bride_field,
              'operator', 'equals',
              'value', rule.answer_value
            ))
          )
      where id = source_row.id;

      if not exists (
        select 1
        from public.service_requirements_metadata
        where service_code = 'MARRIAGE_LICENSE'
          and requirement_name = source_row.requirement_name
          and subject_role = 'Groom'
      ) then
        insert into public.service_requirements_metadata (
          service_code,
          requirement_name,
          is_mandatory,
          requirement_group,
          where_to_secure,
          case_tag,
          applies_when,
          requires_upload,
          upload_scope,
          subject_role
        ) values (
          source_row.service_code,
          source_row.requirement_name,
          source_row.is_mandatory,
          source_row.requirement_group,
          source_row.where_to_secure,
          source_row.case_tag,
          jsonb_build_object(
            'match', 'all',
            'conditions', jsonb_build_array(jsonb_build_object(
              'field', rule.groom_field,
              'operator', 'equals',
              'value', rule.answer_value
            ))
          ),
          true,
          'specific_subject',
          'Groom'
        );
      end if;
    end if;
  end loop;
end
$$;
