-- Registry-number fields have no help text, in online forms or walk-ins.
-- Publish new active versions; leave forms pinned to existing requests intact.
do $$
declare
  template_row record;
  section jsonb;
  sections jsonb;
  fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for template_row in
    select t.id,v.definition from public.form_templates t
    join public.form_template_versions v on v.id=t.active_version_id
  loop
    sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
      select coalesce(jsonb_agg(case
        when f->>'key' in ('reference_number','registry_number')
          or f->>'label' ~* '(registry|registration).*(number|no[.]?($|[[:space:]]))'
        then f-'helpText' else f end order by ord),'[]'::jsonb) into fields
      from jsonb_array_elements(section->'fields') with ordinality entries(f,ord);
      sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
    end loop;
    next_definition := jsonb_set(template_row.definition,'{sections}',sections);
    if next_definition = template_row.definition then continue; end if;
    select coalesce(max(version),0)+1 into next_version
    from public.form_template_versions where template_id=template_row.id;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    values(template_row.id,next_version,'published',next_definition,now()) returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=template_row.id;
  end loop;
end $$;

update public.form_field_blocks b
set fields=(select jsonb_agg(case
    when f->>'key' in ('reference_number','registry_number')
      or f->>'label' ~* '(registry|registration).*(number|no[.]?($|[[:space:]]))'
    then f-'helpText' else f end order by ord)
  from jsonb_array_elements(b.fields) with ordinality entries(f,ord)),
  version=version+1,updated_at=now()
where exists(select 1 from jsonb_array_elements(b.fields) f
  where f ? 'helpText' and (f->>'key' in ('reference_number','registry_number')
    or f->>'label' ~* '(registry|registration).*(number|no[.]?($|[[:space:]]))'));
