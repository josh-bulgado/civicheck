update public.services_registry
set steps_description[1] =
  'Submit the request online, with or without optional file attachments; CCRO checks the request, then registers and signs.'
where upper(service_code) = 'BIRTH_ONTIME';
