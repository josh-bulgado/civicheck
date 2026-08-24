-- Which person(s) a service asks the applicant/staff about. Every service
-- defaults to one "Subject" (the person named on the civil registry record);
-- Marriage License is about two people, so it gets Bride/Groom.
alter table services_registry
  add column party_roles text[] not null default array['Subject'];

update services_registry
  set party_roles = array['Bride', 'Groom']
  where service_code = 'MARRIAGE_LICENSE';
