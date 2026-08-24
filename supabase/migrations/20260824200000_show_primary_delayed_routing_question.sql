-- The first applicant-controlled routing question must be available before the
-- birth date is entered. Age still participates in outcome resolution, but it
-- no longer controls whether the Registration program question is visible.

do $$
declare
  template_row record;
  current_definition jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
  next_questions jsonb;
begin
  select template.*, version.definition
  into template_row
  from public.form_templates template
  join public.form_template_versions version
    on version.id = template.active_version_id
  where template.template_key = 'birth_delayed';

  if found and exists (
    select 1
    from jsonb_array_elements(
      coalesce(
        template_row.definition->'caseSelector'->'questions',
        '[]'::jsonb
      )
    ) question
    where question->>'key' = 'program' and question ? 'visibleWhen'
  ) then
    current_definition := template_row.definition;

    select jsonb_agg(
      case
        when question->>'key' = 'program' then question - 'visibleWhen'
        else question
      end
      order by question_ordinality
    )
    into next_questions
    from jsonb_array_elements(
      current_definition->'caseSelector'->'questions'
    ) with ordinality as questions(question, question_ordinality);

    next_definition := jsonb_set(
      current_definition,
      '{caseSelector,questions}',
      next_questions,
      true
    );

    select coalesce(max(version), 0) + 1 into next_version
    from public.form_template_versions
    where template_id = template_row.id;

    insert into public.form_template_versions (
      template_id, version, status, definition, published_at
    ) values (
      template_row.id, next_version, 'published', next_definition, now()
    ) returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end if;
end
$$;
