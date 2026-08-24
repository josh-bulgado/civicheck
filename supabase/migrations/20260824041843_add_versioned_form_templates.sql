-- Versioned, database-backed application forms. Published versions are never
-- edited in place; every admin change produces a new immutable version so an
-- existing request can always be interpreted with the exact form it used.

create table public.form_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  description text,
  active_version_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.form_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.form_templates(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  definition jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  published_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (template_id, version),
  check (jsonb_typeof(definition) = 'object')
);

alter table public.form_templates
  add constraint form_templates_active_version_fkey
  foreign key (active_version_id) references public.form_template_versions(id)
  on delete restrict;

create table public.service_form_templates (
  service_code text primary key references public.services_registry(service_code) on delete cascade,
  template_id uuid not null references public.form_templates(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.requests
  add column form_template_version_id uuid
  references public.form_template_versions(id) on delete restrict;

create index form_template_versions_template_status_idx
  on public.form_template_versions(template_id, status, version desc);
create index service_form_templates_template_idx
  on public.service_form_templates(template_id);
create index requests_form_template_version_idx
  on public.requests(form_template_version_id)
  where form_template_version_id is not null;

-- One initial reusable template per display group (or per standalone service).
-- Group variants already share their intake semantics, so they bind to the
-- same template and future edits remain consistent across the family.
insert into public.form_templates (template_key, name, description)
select distinct on (coalesce(display_group, service_code))
  lower(regexp_replace(coalesce(display_group, service_code), '[^a-zA-Z0-9_-]+', '-', 'g')),
  coalesce(display_name, name) || ' application',
  'Initial form migrated from the service registry configuration.'
from public.services_registry
order by coalesce(display_group, service_code), service_code;

insert into public.service_form_templates (service_code, template_id)
select service.service_code, template.id
from public.services_registry service
join public.form_templates template
  on template.template_key = lower(regexp_replace(
    coalesce(service.display_group, service.service_code),
    '[^a-zA-Z0-9_-]+', '-', 'g'
  ));

-- Generate version 1 from the fields that drive today's hardcoded wizard.
with representative as (
  select distinct on (binding.template_id)
    binding.template_id,
    service.*
  from public.service_form_templates binding
  join public.services_registry service on service.service_code = binding.service_code
  order by binding.template_id, service.service_code
), seeded as (
  insert into public.form_template_versions (
    template_id, version, status, definition, published_at
  )
  select
    template_id,
    1,
    'published',
    jsonb_build_object(
      'schemaVersion', 1,
      'sections', jsonb_build_array(
        jsonb_build_object(
          'key', 'case',
          'step', 'case',
          'title', 'Case details',
          'fields',
            jsonb_build_array(
              jsonb_build_object(
                'key', 'event_date', 'type', 'date',
                'label', coalesce(event_date_label, 'Date of event'),
                'required', true,
                'dateDirection', event_date_direction
              ),
              jsonb_build_object(
                'key', 'event_place', 'type', 'text',
                'label', coalesce(event_place_label, 'Place of event'),
                'required', true,
                'placeholder', 'e.g. Legazpi City, Albay'
              )
            )
            || case when asks_birth_details then jsonb_build_array(
              jsonb_build_object(
                'key', 'place_type', 'type', 'select',
                'label', 'Where did the birth take place?', 'required', false,
                'options', jsonb_build_array(
                  jsonb_build_object('value', 'hospital', 'label', 'Hospital / Clinic'),
                  jsonb_build_object('value', 'home', 'label', 'Home'),
                  jsonb_build_object('value', 'other', 'label', 'Other')
                )
              ),
              jsonb_build_object(
                'key', 'informant_relationship', 'type', 'select',
                'label', 'Informant''s relationship to the child', 'required', false,
                'options', jsonb_build_array(
                  jsonb_build_object('value', 'Mother', 'label', 'Mother'),
                  jsonb_build_object('value', 'Father', 'label', 'Father'),
                  jsonb_build_object('value', 'Grandparent', 'label', 'Grandparent'),
                  jsonb_build_object('value', 'Guardian', 'label', 'Guardian'),
                  jsonb_build_object('value', 'Physician / Midwife', 'label', 'Physician / Midwife'),
                  jsonb_build_object('value', 'Other', 'label', 'Other')
                )
              ),
              jsonb_build_object(
                'key', 'informant_name', 'type', 'text',
                'label', 'Informant''s name', 'required', false,
                'placeholder', 'Full name of the person reporting the birth'
              )
            ) else '[]'::jsonb end
            || case when reference_number_label is not null then jsonb_build_array(
              jsonb_build_object(
                'key', 'reference_number', 'type', 'text',
                'label', reference_number_label, 'required', false
              )
            ) else '[]'::jsonb end
            || case when asks_purpose then jsonb_build_array(
              jsonb_build_object(
                'key', 'purpose', 'type', 'select',
                'label', 'Purpose of request', 'required', true,
                'options', jsonb_build_array(
                  jsonb_build_object('value', 'Local Use (ID, Barangay, etc.)', 'label', 'Local Use (ID, Barangay, etc.)'),
                  jsonb_build_object('value', 'Employment', 'label', 'Employment'),
                  jsonb_build_object('value', 'Passport / Travel', 'label', 'Passport / Travel'),
                  jsonb_build_object('value', 'School Records / Admission', 'label', 'School Records / Admission'),
                  jsonb_build_object('value', 'Social Security (SSS/GSIS/etc.)', 'label', 'Social Security (SSS/GSIS/etc.)'),
                  jsonb_build_object('value', 'Legal / Court proceedings', 'label', 'Legal / Court proceedings'),
                  jsonb_build_object('value', 'Other', 'label', 'Other')
                )
              ),
              jsonb_build_object(
                'key', 'purpose_other', 'type', 'text',
                'label', 'Specify purpose', 'required', true,
                'visibleWhen', jsonb_build_object(
                  'field', 'purpose', 'operator', 'equals', 'value', 'Other'
                )
              )
            ) else '[]'::jsonb end
            || jsonb_build_array(
              jsonb_build_object(
                'key', 'additional_notes', 'type', 'textarea',
                'label', 'Additional notes', 'required', false,
                'placeholder', 'Any special requests or instructions…'
              )
            )
        ),
        jsonb_build_object(
          'key', 'details',
          'step', 'details',
          'title', 'Your details',
          'fields', jsonb_build_array(
            jsonb_build_object(
              'key', 'subjects', 'type', 'person_group',
              'label', 'Person named on the record', 'required', true
            ),
            jsonb_build_object(
              'key', 'contact_number', 'type', 'phone',
              'label', 'Contact number', 'required', false,
              'placeholder', '9171234567'
            )
          )
        )
      )
    ),
    now()
  from representative
  returning id, template_id
)
update public.form_templates template
set active_version_id = seeded.id, updated_at = now()
from seeded
where template.id = seeded.template_id;

alter table public.form_templates enable row level security;
alter table public.form_template_versions enable row level security;
alter table public.service_form_templates enable row level security;

create policy "Authenticated users can read form templates"
  on public.form_templates for select to anon, authenticated using (true);

create policy "Authenticated users can read service form bindings"
  on public.service_form_templates for select to anon, authenticated using (true);

create policy "Users can read published form versions"
  on public.form_template_versions for select to anon, authenticated
  using (
    status = 'published'
    or exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  );

create policy "Administrators can manage form templates"
  on public.form_templates for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  );

create policy "Administrators can manage form versions"
  on public.form_template_versions for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  );

create policy "Administrators can manage service form bindings"
  on public.service_form_templates for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  );

-- The application grants services:manage to both CCRO and system admins. Keep
-- database authorization aligned so a system admin can use the same editor,
-- including its combined service/checklist save operation.
create policy "System administrators can manage services registry"
  on public.services_registry for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text = 'system_admin'
        and profile.access_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text = 'system_admin'
        and profile.access_status = 'active'
    )
  );

create policy "System administrators can manage service requirements"
  on public.service_requirements_metadata for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text = 'system_admin'
        and profile.access_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text = 'system_admin'
        and profile.access_status = 'active'
    )
  );

-- Published versions are immutable. They may be archived, but their definition
-- and identifying metadata cannot be rewritten after applicants have used them.
create or replace function public.protect_published_form_version()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.status = 'published' then
    raise exception 'Published form versions cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' and (
    new.definition is distinct from old.definition
    or new.version is distinct from old.version
    or new.template_id is distinct from old.template_id
    or new.status is distinct from old.status
  ) then
    raise exception 'Published form versions are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger protect_published_form_version_trigger
before update or delete on public.form_template_versions
for each row execute function public.protect_published_form_version();

-- Form configuration is public reference data within the signed-in portal and
-- participates in the same realtime refresh mechanism as the service registry.
do $$
begin
  begin
    alter publication supabase_realtime add table public.form_templates;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.form_template_versions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.service_form_templates;
  exception when duplicate_object then null;
  end;
end $$;
