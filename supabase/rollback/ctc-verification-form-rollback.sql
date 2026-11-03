-- ROLLBACK for the CTC Verification Form work (branch feat/ctc-verification-form).
--
-- This file is NOT a migration. The Supabase CLI ignores it (it is not in
-- supabase/migrations), so nothing runs it automatically. Run it by hand, in the
-- Supabase SQL editor, only if you want the certified true copy (CTC) form back
-- the way it was BEFORE this work.
--
-- What it undoes
--   1. The CTC form template (`ctc_issuance`) goes back to its original version
--      (version 6). Every later version (7 and up) stays in the database, so
--      requests already filed on them still open normally; they simply stop
--      being the version new applicants see.
--   2. The "Authorization Letter" requirement goes back to its original wording
--      and rule (needed whenever the requester is not the owner), and the
--      "Verification Form" requirement goes back to a mandatory upload.
--   3. The "Registry/OCT number" label comes back on the two CTC services.
--
-- What it does not touch
--   - Requests already submitted (they keep the form version they were filed on).
--   - The application code. If you also want the code gone, do not merge the
--     branch, or revert its commit. The code is harmless against the old form
--     version: the new layout settings are simply ignored.
--   - Other services.
--
-- Safe to run more than once.
--
-- If a value below no longer matches (for example someone edited the form in the
-- admin screen after this work), look the original up first:
--   select id, version, status, published_at
--   from public.form_template_versions
--   where template_id = '66fb5541-ed2c-457d-97e8-4e5a226c6eee'
--   order by version;
-- Version 6 is the original.
--
-- After running: the app caches forms for about 5 minutes per server, so the old
-- form can take that long (or a server restart) to show up.

-- 1. Point the CTC template back to its original version (version 6).
update public.form_templates
set active_version_id = '1e6ff10e-8390-4636-9643-43569d769c57',
    updated_at = now()
where id = '66fb5541-ed2c-457d-97e8-4e5a226c6eee'
  and template_key = 'ctc_issuance';

-- 2. Restore the original authorization-letter requirement.
update public.service_requirements_metadata
set requirement_name = 'Authorization Letter of the document owner / Affidavit of Kinship — required if the requester is not the document owner',
    applies_when = jsonb_build_object(
      'match', 'all',
      'conditions', jsonb_build_array(jsonb_build_object(
        'field', 'requester_relationship',
        'operator', 'not_equals',
        'value', 'owner'
      ))
    )
where id = '44722972-6714-4c5c-a829-f66ab881d881';

-- 2b. Restore the Verification Form as a mandatory upload (it was changed to
--     "we fill it in; sign it at the CCRO", with no upload slot).
update public.service_requirements_metadata
set requirement_name = 'Verification Form, properly filled up and signed by the requesting party',
    requires_upload = true,
    upload_scope = 'request'
where id = 'c3815a6a-97df-46ed-b22b-3c14ecfdbe6b';

-- 3. Restore the "Registry/OCT number" label on the CTC services.
update public.services_registry
set reference_number_label = 'Registry/OCT number'
where service_code in ('CTC-LOCAL', 'CTC-ABROAD');

-- Check the result: should show version 6 and the old rule.
select v.version as active_version
from public.form_templates t
join public.form_template_versions v on v.id = t.active_version_id
where t.template_key = 'ctc_issuance';
