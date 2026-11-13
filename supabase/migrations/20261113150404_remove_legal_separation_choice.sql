-- Remove the legal-separation choice without changing existing request versions.
do $$
declare
  template_row record;
  questions jsonb;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id,v.definition into strict template_row
  from public.form_templates t join public.form_template_versions v on v.id=t.active_version_id
  where t.template_key='court_decree';
  select jsonb_agg(case when q->>'key'='court_decree_type' then
    jsonb_set(q,'{options}',(select jsonb_agg(o order by o_ord)
      from jsonb_array_elements(q->'options') with ordinality options(o,o_ord)
      where o->>'value'<>'legal_separation')) else q end order by q_ord)
  into questions
  from jsonb_array_elements(template_row.definition->'caseSelector'->'questions') with ordinality entries(q,q_ord);
  next_definition := jsonb_set(template_row.definition,'{caseSelector,questions}',questions);
  if next_definition=template_row.definition then return; end if;
  select coalesce(max(version),0)+1 into next_version from public.form_template_versions where template_id=template_row.id;
  insert into public.form_template_versions(template_id,version,status,definition,published_at)
  values(template_row.id,next_version,'published',next_definition,now()) returning id into published_id;
  update public.form_templates set active_version_id=published_id,updated_at=now() where id=template_row.id;
end $$;
