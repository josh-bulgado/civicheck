-- Citizen's Charter item 11, PDF pages 16-19. Keep record/correction details
-- and questions needed for its checklist and fees. Preserve old form versions.
do $$
declare
  current_template record;
  section jsonb;
  fields jsonb;
  sections jsonb := '[]';
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into current_template from public.form_templates t
  join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='ra9048_10172';
  if not found then raise exception 'Petition template not found'; end if;
  for section in select value from jsonb_array_elements(current_template.definition->'sections') loop
    select coalesce(jsonb_agg(value order by ordinality),'[]'::jsonb) into fields
    from jsonb_array_elements(section->'fields') with ordinality
    where value->>'key' not in (
      'first_name_ground','registered_in_legazpi','petitioner_relationship',
      'has_additional_corrections','additional_corrections_for_review',
      'petitioner_name','additional_notes','contact_number'
    );
    sections := sections || jsonb_build_array(jsonb_set(section,'{fields}',fields));
  end loop;
  next_definition := jsonb_set(current_template.definition,'{sections}',sections);
  if next_definition is distinct from current_template.definition then
    select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=current_template.id;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
      values(current_template.id,next_version,'published',next_definition,now()) returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=current_template.id;
  end if;
end $$;

-- Remove only the petition-specific authority confirmation, retaining physical
-- completeness, identity of accepting staff, department, payment, and audit guards.
do $$
declare original text; updated text;
begin
  if to_regprocedure('public.protect_birth_walkin_acceptance()') is not null then
    select pg_get_functiondef('public.protect_birth_walkin_acceptance()'::regprocedure) into original;
    updated := regexp_replace(original,
      '[[:space:]]+or new\.form_data->>''petition_authority_confirmed'' is distinct from ''true''', '', 'g');
    updated := replace(updated,'Check the filing papers and petitioner authority before accepting the petition',
      'Check the filing papers before accepting the petition');
    if updated is distinct from original then execute updated; end if;
  end if;
  if to_regprocedure('public.log_birth_walkin_acceptance()') is not null then
    select pg_get_functiondef('public.log_birth_walkin_acceptance()'::regprocedure) into original;
    updated := replace(original,'Accepted walk-in petition. Checked filing papers and authority to file.',
      'Accepted walk-in petition. Checked filing papers.');
    if updated is distinct from original then execute updated; end if;
  end if;
end $$;
