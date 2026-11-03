-- Personal appearance of the couple is an instruction completed at CCRO, not a
-- file the applicant uploads. Same treatment as Marriage License.
update public.service_requirements_metadata
set requires_upload = false
where service_code = 'LEGITIMATION'
  and requirement_name ilike 'Mandatory personal appearance%';
