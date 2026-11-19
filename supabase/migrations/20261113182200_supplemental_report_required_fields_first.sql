-- Put required Supplemental Report case fields before optional fields.
do $$
declare
  template_row record;
  sections jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  join public.service_form_templates b on b.template_id=t.id
  where b.service_code='SUPPLEMENTAL_REPORT';

  select jsonb_agg(
    case when s->>'step'='case' then jsonb_set(s,'{fields}',(
      select jsonb_agg(f order by coalesce((f->>'required')::boolean,false) desc, field_order)
      from jsonb_array_elements(s->'fields') with ordinality entries(f,field_order)
    )) else s end order by section_order
  ) into sections
  from jsonb_array_elements(template_row.definition->'sections') with ordinality entries(s,section_order);
  next_definition := jsonb_set(template_row.definition,'{sections}',sections);
  if next_definition = template_row.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now())
  returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=template_row.id;
end $$;
