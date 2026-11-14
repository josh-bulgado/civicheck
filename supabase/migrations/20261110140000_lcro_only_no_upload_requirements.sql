-- Citizen's Charter 2025, PDF pages 6-7, 11, and 17.
-- Only these reviewed requirements have LCRO as their sole source.
-- Keep the requested service exemptions and all other requirements unchanged.
update public.service_requirements_metadata
set requires_upload = false
where requires_upload = true
  and (
    where_to_secure is null
    or lower(trim(where_to_secure)) in (
      'lcro', 'ccro', 'local civil registrar',
      'local civil registrar office', 'local civil registrar''s office',
      'local civil registrar’s office'
    )
  )
  and (
    (
      requirement_group = 'birth_delayed'
      and (
        requirement_name like 'Affidavit of 2 Disinterested Persons%'
        or requirement_name like 'Affidavit of Two Disinterested%'
      )
    )
    or (
      requirement_group = 'MARRIAGE_LICENSE'
      and (
        requirement_name like 'Consent, for applicants 18-20 years old,%'
        or requirement_name like 'Parental Advice, for applicants 21-24 years old,%'
      )
    )
    or (
      requirement_group = 'ra9048_10172'
      and requirement_name = '[RA 10172 Sex/DOB Correction] Notice and Certificate of Posting'
    )
  );
