-- Remove only Electronic Endorsement's requester section from new applications.
-- Keep the owner fields and the versions used by existing requests.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'elec_endorsement'
  for update of t;
  if not found then raise exception 'Electronic endorsement template not found'; end if;

  if not exists (
    select 1 from jsonb_array_elements(target.definition->'sections') s
    where s->>'key' = 'details_requester'
  ) then return; end if;

  select jsonb_set(target.definition, '{sections}', jsonb_agg(s order by si))
  into next_definition
  from jsonb_array_elements(target.definition->'sections') with ordinality as sections(s, si)
  where s->>'key' <> 'details_requester';

  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = target.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(target.id, next_version, 'published', next_definition, now()) returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now() where id = target.id;
end;
$$;
