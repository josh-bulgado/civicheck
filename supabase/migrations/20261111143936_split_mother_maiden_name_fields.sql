-- Keep the existing birth-only condition and publish new versions for CTC and Email Inquiry.
do $$
declare
  target record;
  section jsonb;
  field jsonb;
  next_sections jsonb;
  next_fields jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  for target in
    select t.id, v.definition from public.form_templates t
    join public.form_template_versions v on v.id=t.active_version_id
    where t.template_key in ('ctc_issuance', 'email_inquiry') for update of t
  loop
    next_sections := '[]'::jsonb;
    for section in select value from jsonb_array_elements(target.definition->'sections') loop
      next_fields := '[]'::jsonb;
      for field in select value from jsonb_array_elements(section->'fields') loop
        if field->>'key' = 'mother_maiden_name' then
          next_fields := next_fields || jsonb_build_array(
            (field - 'placeholder' - 'helpText' - 'blockKey') || jsonb_build_object(
              'key','mother_first_name','label','Mother''s first name','inline',true),
            (field - 'placeholder' - 'helpText' - 'blockKey') || jsonb_build_object(
              'key','mother_middle_name','label','Mother''s middle name','inline',true,'noneLabel','No middle name'),
            (field - 'placeholder' - 'helpText' - 'blockKey') || jsonb_build_object(
              'key','mother_last_name','label','Mother''s maiden last name','inline',true)
          );
        else
          next_fields := next_fields || jsonb_build_array(field);
        end if;
      end loop;
      next_sections := next_sections || jsonb_build_array(jsonb_set(section,'{fields}',next_fields));
    end loop;
    next_definition := jsonb_set(target.definition,'{sections}',next_sections);
    if next_definition = target.definition then continue; end if;
    select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=target.id;
    insert into public.form_template_versions(template_id,version,status,definition,published_at)
    values(target.id,next_version,'published',next_definition,now()) returning id into published_id;
    update public.form_templates set active_version_id=published_id,updated_at=now() where id=target.id;
  end loop;
end
$$;
