-- CTC issuance: the Verification Form is filled in by CiviCheck and signed at the
-- CCRO, so it is no longer an upload.
--
-- Before: a mandatory upload of a signed form. That could not work, because the
-- printable form only exists after the request is submitted.
-- Now: it stays on the checklist but without an upload slot, so the documents
-- step lists it under "Complete at the CCRO - no upload needed". The wording says
-- what to do, because that list shows only the part of the name before any dash.
--
-- Safe to run more than once.

update public.service_requirements_metadata
set requirement_name = 'Verification Form: we fill it in for you. Print it and sign it at the CCRO.',
    requires_upload = false,
    upload_scope = 'request' -- the app's own value for a requirement with no upload
where id = 'c3815a6a-97df-46ed-b22b-3c14ecfdbe6b'
  and requirement_group = 'ctc_issuance';
