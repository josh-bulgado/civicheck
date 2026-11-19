-- Keep all record-owner and parent names before the contact number.
do $$
declare
  target record;
  contact_field jsonb;
  next_definition jsonb;
  published_id uuid;
begin
  for target in
    select t.id,v.definition from public.form_templates t
    join public.form_template_versions v on v.id=t.active_version_id
    where t.template_key in ('birth_ontime','birth_delayed','ctc_issuance')
    for update of t
  loop
    select f into contact_field
    from jsonb_array_elements(target.definition->'sections') s,
      jsonb_array_elements(s->'fields') f
    where f->>'key'='contact_number' limit 1;
    if contact_field is null then continue; end if;

    select jsonb_set(target.definition,'{sections}',jsonb_agg(
      s || jsonb_build_object('fields',
        (select coalesce(jsonb_agg(f order by fi),'[]'::jsonb)
         from jsonb_array_elements(s->'fields') with ordinality fields(f,fi)
         where f->>'key'<>'contact_number') ||
        case when s->>'key'='details' then jsonb_build_array(contact_field) else '[]'::jsonb end
      ) order by si
    )) into next_definition
    from jsonb_array_elements(target.definition->'sections') with ordinality sections(s,si);
    if next_definition=target.definition then continue; end if;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    select target.id,coalesce(max(version),0)+1,'published',next_definition,now()
    from public.form_template_versions where template_id=target.id returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
  end loop;
end $$;
