-- Citizen's Charter, PDF pages 13-14: reconstruction checklist item 4.
update public.service_requirements_metadata
set where_to_secure = 'Secure from Client/LCR/PSA'
where service_code = 'MARRIAGE_DELAYED'
  and requirement_name ilike '%Birth certificates of children%';
