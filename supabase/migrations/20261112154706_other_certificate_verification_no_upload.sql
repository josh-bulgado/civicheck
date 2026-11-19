-- The verification form is completed at CCRO; keep it mandatory.
update public.service_requirements_metadata
set requires_upload = false
where service_code = 'OTHER_CERT'
  and requirement_group = 'OTHER_CERT'
  and requirement_name = 'Application/Verification Form, 1 original copy';
