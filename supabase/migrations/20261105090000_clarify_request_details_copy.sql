-- Replace vague "case" language and internal "track" jargon in the active
-- applicant form templates. Preserve version history by publishing a new
-- version only when an active definition contains one of the old phrases.
do $$
declare
  target record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for target in
    select template.id, version.definition
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id
  loop
    next_definition := target.definition;
    next_definition := replace(
      next_definition::text,
      '"title": "Case details"',
      '"title": "Request details"'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"title": "Find the right service"',
      '"title": "Answer a few questions"'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"title": "Find the right delayed-registration service"',
      '"title": "Answer a few questions about delayed registration"'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"description": "Choose the answers that match this case. We’ll select the correct service."',
      '"description": "Your answers help us select the right service."'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"description": "Answer these questions so we can apply the correct fee, parties, process, and requirements."',
      '"description": "Your answers help us select the correct service, fee, process, and requirements."'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"description": "Use the registration track that matches the birth date."',
      '"description": "Use the registration type that matches the birth date."'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"label": "Age of the person to be registered"',
      '"label": "How old is the person being registered?"'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"label": "Registration program"',
      '"label": "How will the birth be registered?"'
    )::jsonb;
    next_definition := replace(
      next_definition::text,
      '"label": "BRAP-assisted registration"',
      '"label": "With BRAP assistance"'
    )::jsonb;

    if next_definition is distinct from target.definition then
      select coalesce(max(version), 0) + 1
      into next_version
      from public.form_template_versions
      where template_id = target.id;

      insert into public.form_template_versions (
        template_id,
        version,
        status,
        definition,
        published_at
      ) values (
        target.id,
        next_version,
        'published',
        next_definition,
        now()
      ) returning id into published_id;

      update public.form_templates
      set active_version_id = published_id,
          updated_at = now()
      where id = target.id;
    end if;
  end loop;
end
$$;
