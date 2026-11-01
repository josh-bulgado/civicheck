-- Label and require the requester's address on both verification forms.
-- Publish new versions so existing submissions retain their original schemas.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for target in
    select t.id, t.template_key, v.definition
    from public.form_templates t
    join public.form_template_versions v on v.id = t.active_version_id
    where t.template_key in ('ctc_issuance', 'email_inquiry')
    for update of t
  loop
    if not exists (
      select 1 from jsonb_array_elements(target.definition->'sections') s,
        jsonb_array_elements(s->'fields') f
      where f->>'key' = 'requester_address'
    ) then
      raise exception 'Requester address missing in %', target.template_key;
    end if;

    select jsonb_set(target.definition, '{sections}', jsonb_agg(
      jsonb_set(s, '{fields}', (
        select jsonb_agg(
          case when f->>'key' = 'requester_address'
            then f || '{"label":"Address","required":true}'::jsonb
            else f end order by fp
        )
        from jsonb_array_elements(s->'fields') with ordinality as fields(f, fp)
      )) order by sp
    )) into next_definition
    from jsonb_array_elements(target.definition->'sections')
      with ordinality as sections(s, sp);

    if next_definition = target.definition then continue; end if;

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions where template_id = target.id;

    insert into public.form_template_versions
      (template_id, version, status, definition, published_at)
    values (target.id, next_version, 'published', next_definition, now())
    returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = target.id;
  end loop;
end
$$;
