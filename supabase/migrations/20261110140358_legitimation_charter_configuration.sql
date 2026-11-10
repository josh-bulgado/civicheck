-- Citizen's Charter 2025, PDF pages 8-9.
-- The stated P410 total covers endorsement, mailing, and one certified-copy page.
update public.services_registry
set fee_components = '[
  {"label": "Endorsement fee", "amount": 250, "included": true},
  {"label": "Mailing fee", "amount": 155, "included": true},
  {"label": "First certified-copy page", "amount": 5, "included": true},
  {"label": "Additional certified-copy pages", "amount": 5, "included": false, "unit": "page", "note": "Only pages beyond the first"}
]'::jsonb
where service_code = 'LEGITIMATION';

update public.service_requirements_metadata
set where_to_secure = 'Local Civil Registrar''s Office / Any Notary Public'
where service_code = 'LEGITIMATION'
  and (
    requirement_name ilike 'Affidavit of Legitimation%'
    or requirement_name ilike '%Admission of Paternity%'
  );
