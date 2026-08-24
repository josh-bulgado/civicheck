-- Per-service labels for the "case details" step (event date/place + an
-- optional reference number), so the wording and date direction fit what the
-- service is actually about instead of one generic "Date of event" for all.
alter table services_registry
  add column event_date_label text,
  add column event_place_label text,
  add column event_date_direction text not null default 'past'
    check (event_date_direction in ('past', 'future', 'any')),
  add column reference_number_label text;

-- Birth registration
update services_registry
  set event_date_label = 'Date of birth', event_place_label = 'Place of birth'
  where service_code in (
    'OTCOLB-MARITAL', 'OTCOLB-NONMARITAL',
    'DCOLB-0079-BRAP', 'DCOLB-0079-NORMAL-MARITAL', 'DCOLB-0079-NORMAL-NONMARITAL',
    'DCOLB-80UP-BRAP', 'DCOLB-80UP-NORMAL-MARITAL', 'DCOLB-80UP-NORMAL-NONMARITAL'
  );

-- Death registration
update services_registry
  set event_date_label = 'Date of death', event_place_label = 'Place of death'
  where service_code in ('DEATH_ONTIME', 'DEATH_DELAYED');

-- Marriage registration (already happened)
update services_registry
  set event_date_label = 'Date of marriage', event_place_label = 'Place of marriage'
  where service_code in ('MARRIAGE_ONTIME', 'MARRIAGE_DELAYED');

-- Marriage License: prospective, not a past event
update services_registry
  set event_date_label = 'Intended date of marriage',
      event_place_label = 'Intended place of marriage',
      event_date_direction = 'future'
  where service_code = 'MARRIAGE_LICENSE';

-- Copies of / corrections to an existing registered record
update services_registry
  set event_date_label = 'Date on the requested record',
      event_place_label = 'Place on the requested record',
      reference_number_label = 'Registry/OCT number (if known)'
  where service_code in (
    'CTC-LOCAL', 'CTC-ABROAD', 'RA9048-CCE', 'RA9048-CFN',
    'RA9255_SURNAME', 'LEGITIMATION', 'SUPPLEMENTAL_REPORT'
  );

-- Court decree registration
update services_registry
  set event_date_label = 'Date of the court decision',
      event_place_label = 'Court that issued the decision',
      reference_number_label = 'Case/docket number (if known)'
  where service_code in ('COURT-ANNULMENT', 'COURT-FOREIGN-ADOPTION');

-- ELEC_ENDORSEMENT, EMAIL_INQUIRY, OTHER_CERT left at defaults (generic wording).
