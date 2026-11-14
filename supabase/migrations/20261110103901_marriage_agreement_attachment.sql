-- Ask about an existing agreement without limiting it to a marriage basis.
do $$
declare
  target record;
  next_definition jsonb;
  published_id uuid;
  next_version integer;
  agreement_field jsonb := '{"key":"has_marriage_agreement","type":"select","label":"Do you have a Dowry Agreement, Marriage Settlement, or Prenuptial Agreement to attach?","required":true,"options":[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]}'::jsonb;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'marriage_ontime';
  if not found then raise exception 'On-time marriage template not found'; end if;

  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') section,
      jsonb_array_elements(section->'fields') field
    where field->>'key' = 'has_marriage_agreement'
  ) then
    select jsonb_set(target.definition, '{sections}', jsonb_agg(
      case when section->>'step' = 'case' then jsonb_set(section, '{fields}', (
        select jsonb_agg(item.field order by item.sort_key) from (
          select f.field, f.ord::numeric as sort_key
          from jsonb_array_elements(section->'fields') with ordinality f(field,ord)
          union all
          select agreement_field, f.ord::numeric + 0.5
          from jsonb_array_elements(section->'fields') with ordinality f(field,ord)
          where f.field->>'key' = 'marriage_license_basis'
        ) item
      )) else section end order by section_ord
    )) into next_definition
    from jsonb_array_elements(target.definition->'sections') with ordinality s(section,section_ord);

    select coalesce(max(version),0)+1 into next_version
    from public.form_template_versions where template_id = target.id;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
    update public.form_templates set active_version_id=published_id, updated_at=now() where id=target.id;
  end if;
end;
$$;

update public.service_requirements_metadata
set is_mandatory = true,
    requires_upload = true,
    applies_when = '{"match":"all","conditions":[{"field":"has_marriage_agreement","operator":"equals","value":"yes"}]}'::jsonb
where service_code = 'MARRIAGE_ONTIME'
  and requirement_name ilike 'Dowry Agreement Form%';
