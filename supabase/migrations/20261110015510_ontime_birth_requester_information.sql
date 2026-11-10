-- Publish requester details for on-time birth without changing older applications.
do $$
declare
  target record;
  sections jsonb;
  requester_fields jsonb;
  published_id uuid;
  next_version integer;
begin
  select t.id, v.definition into target
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'birth_ontime'
  for update of t;
  if not found then raise exception 'On-time birth template not found'; end if;
  if exists (select 1 from jsonb_array_elements(target.definition->'sections') s
    where s->>'key' = 'details_requester') then return; end if;

  requester_fields := '[
    {"key":"requester_first_name","type":"text","label":"Requester''s first name","required":true,"inline":true},
    {"key":"requester_middle_name","type":"text","label":"Requester''s middle name","required":true,"inline":true,"noneLabel":"No middle name"},
    {"key":"requester_last_name","type":"text","label":"Requester''s last name","required":true,"inline":true},
    {"key":"requester_relationship","type":"select","label":"Relationship to the child","required":true,
      "helpText":"Staff will verify your capacity to submit this registration and the required documents.",
      "options":[{"value":"mother","label":"Mother"},{"value":"father","label":"Father"},{"value":"grandparent","label":"Grandparent"},{"value":"guardian","label":"Guardian"},{"value":"physician_midwife","label":"Physician / Midwife"},{"value":"other","label":"Other"}]}
  ]'::jsonb;

  -- Keep the existing contact field and its required/optional setting.
  select requester_fields || coalesce(jsonb_agg(f order by s.ordinality, fields.ordinality), '[]'::jsonb)
  into requester_fields
  from jsonb_array_elements(target.definition->'sections') with ordinality s(section, ordinality)
  cross join lateral jsonb_array_elements(s.section->'fields') with ordinality fields(f, ordinality)
  where f->>'key' = 'contact_number';

  select jsonb_agg(
    case when s->>'step' = 'details' then
      jsonb_build_array(jsonb_build_object(
        'key','details_requester','step','details','title','Requester''s Information',
        'description','The person submitting this registration may differ from the informant named on the COLB.',
        'fields',requester_fields
      ), (s || jsonb_build_object('title','Child''s Information','fields',
        (select coalesce(jsonb_agg(f order by n), '[]'::jsonb)
         from jsonb_array_elements(s->'fields') with ordinality fields(f,n)
         where f->>'key' <> 'contact_number'))))
    else jsonb_build_array(s) end order by n
  ) into sections
  from jsonb_array_elements(target.definition->'sections') with ordinality sections(s,n);

  select jsonb_agg(s order by a.n,b.n) into sections
  from jsonb_array_elements(sections) with ordinality a(items,n)
  cross join lateral jsonb_array_elements(a.items) with ordinality b(s,n);

  select coalesce(max(version),0)+1 into next_version
  from public.form_template_versions where template_id=target.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(target.id,next_version,'published',jsonb_set(target.definition,'{sections}',sections),now())
  returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
end $$;
