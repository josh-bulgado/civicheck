-- Attach an owning department to every civil registry service.
--
-- `departments` previously only answered "which department does this staff member
-- belong to" (profiles.department_id). The request queue needs the other half:
-- which department a request is targeted at. A request's department is derived
-- from its service (requests.request_type -> services_registry.service_code),
-- so the department lives on the service and stays admin-editable.

alter table public.services_registry
  add column if not exists department_id text references public.departments(id);

create index if not exists services_registry_department_id_idx
  on public.services_registry (department_id);

-- Backfill the 25 charter services. Listed explicitly (not by LIKE pattern) so
-- the routing decision for each service code is auditable in review.

update public.services_registry set department_id = 'birth'
where service_code in (
  'OTCOLB-MARITAL',
  'OTCOLB-NONMARITAL',
  'DCOLB-0079-BRAP',
  'DCOLB-0079-NORMAL-MARITAL',
  'DCOLB-0079-NORMAL-NONMARITAL',
  'DCOLB-80UP-BRAP',
  'DCOLB-80UP-NORMAL-MARITAL',
  'DCOLB-80UP-NORMAL-NONMARITAL'
);

update public.services_registry set department_id = 'marriage'
where service_code in (
  'MARRIAGE_ONTIME',
  'MARRIAGE_DELAYED',
  'MARRIAGE_LICENSE'
);

update public.services_registry set department_id = 'death'
where service_code in (
  'DEATH_ONTIME',
  'DEATH_DELAYED'
);

update public.services_registry set department_id = 'legal'
where service_code in (
  'COURT-ANNULMENT',
  'COURT-FOREIGN-ADOPTION',
  'RA9048-CCE',
  'RA9048-CFN',
  'LEGITIMATION',
  'RA9255_SURNAME',
  'SUPPLEMENTAL_REPORT'
);

update public.services_registry set department_id = 'archives'
where service_code in (
  'CTC-LOCAL',
  'CTC-ABROAD',
  'OTHER_CERT',
  'ELEC_ENDORSEMENT',
  'EMAIL_INQUIRY'
);
