-- Put required questions before optional fields on the Legitimation case page.
do $$
declare
  template_row record;
  sections jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  join public.service_form_templates b on b.template_id=t.id
  where b.service_code='LEGITIMATION';

  select jsonb_agg(case when s.item->>'step'='case' then
    jsonb_set(s.item,'{fields}',(
      select jsonb_agg(f.item order by coalesce((f.item->>'required')::boolean,false) desc,f.ord)
      from jsonb_array_elements(s.item->'fields') with ordinality f(item,ord)
    )) else s.item end order by s.ord) into sections
  from jsonb_array_elements(template_row.definition->'sections') with ordinality s(item,ord);

  next_definition := jsonb_set(template_row.definition,'{sections}',sections);
  if next_definition=template_row.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now())
  returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now()
  where id=template_row.id;
end $$;
