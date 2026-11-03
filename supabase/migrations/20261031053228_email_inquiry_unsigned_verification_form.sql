-- Email assisted verification is completed online; signatures belong on the letters.
update public.service_requirements_metadata
set requirement_name = 'Verification Form: generated for you. No signature or office visit needed.',
    requires_upload = false,
    upload_scope = 'request'
where (service_code = 'EMAIL_INQUIRY' or requirement_group = 'EMAIL_INQUIRY')
  and requirement_name ilike 'Verification Form%';
