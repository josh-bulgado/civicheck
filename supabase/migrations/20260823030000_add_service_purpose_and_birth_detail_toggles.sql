-- "Purpose of request" only makes sense for services that hand over a copy
-- of something that already exists (CTC, Other Certificates) — a
-- registration/license/correction service is creating or fixing the record
-- itself, not issuing a copy for a downstream use.
alter table services_registry
  add column asks_purpose boolean not null default true,
  add column asks_birth_details boolean not null default false;

update services_registry set asks_purpose = false
  where service_code in (
    'OTCOLB-MARITAL', 'OTCOLB-NONMARITAL',
    'DCOLB-0079-BRAP', 'DCOLB-0079-NORMAL-MARITAL', 'DCOLB-0079-NORMAL-NONMARITAL',
    'DCOLB-80UP-BRAP', 'DCOLB-80UP-NORMAL-MARITAL', 'DCOLB-80UP-NORMAL-NONMARITAL'
  );

-- Birth registration additionally asks who the informant is and whether the
-- birth took place at a hospital/clinic or at home.
update services_registry set asks_birth_details = true
  where service_code in (
    'OTCOLB-MARITAL', 'OTCOLB-NONMARITAL',
    'DCOLB-0079-BRAP', 'DCOLB-0079-NORMAL-MARITAL', 'DCOLB-0079-NORMAL-NONMARITAL',
    'DCOLB-80UP-BRAP', 'DCOLB-80UP-NORMAL-MARITAL', 'DCOLB-80UP-NORMAL-NONMARITAL'
  );
