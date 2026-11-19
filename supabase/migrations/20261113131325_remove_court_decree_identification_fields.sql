-- Read these details from the court papers instead of asking applicants again.
-- Publish a new version so existing requests retain their original template.
do $$
declare
  template_row record;
  section jsonb;
  sections jsonb := '[]'::jsonb;
  fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'court_decree';

  for section in select value from jsonb_array_elements(template_row.definition->'sections') loop
    select coalesce(jsonb_agg(f order by ord), '[]'::jsonb) into fields
    from jsonb_array_elements(section->'fields') with ordinality entries(f, ord)
    where f->>'key' not in ('event_date', 'event_place', 'reference_number');
    sections := sections || jsonb_build_array(jsonb_set(section, '{fields}', fields));
  end loop;
  next_definition := jsonb_set(template_row.definition, '{sections}', sections);
  if next_definition = template_row.definition then return; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = template_row.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(template_row.id, next_version, 'published', next_definition, now())
  returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end $$;
