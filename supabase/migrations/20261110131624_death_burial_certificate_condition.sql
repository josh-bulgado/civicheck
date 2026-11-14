-- A cemetery/church burial certificate applies to buried remains.
update public.service_requirements_metadata
set applies_when = '{"match":"all","conditions":[{"field":"disposal_method","operator":"equals","value":"buried"}]}'::jsonb
where service_code = 'DEATH_DELAYED'
  and requirement_name ilike 'Burial Certificate%';
