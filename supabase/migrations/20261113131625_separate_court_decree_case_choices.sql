-- Charter item 13, PDF pages 20-21: case types are separate from fee groups.
-- Legal separation has no listed fee, so direct it to the office without pricing it.
do $$
declare
  template_row record;
  next_definition jsonb;
  next_version integer;
  published_id uuid;
begin
  select t.id, v.definition into strict template_row
  from public.form_templates t
  join public.form_template_versions v on v.id = t.active_version_id
  where t.template_key = 'court_decree';

  next_definition := jsonb_set(template_row.definition, '{caseSelector}', $json$
  {
    "title": "Court decree type",
    "questions": [{
      "key": "court_decree_type",
      "label": "Which court decree are you registering?",
      "options": [
        {"value": "adoption", "label": "Adoption"},
        {"value": "foreign_decree", "label": "Foreign decree", "notice": {
          "variant": "default", "title": "Foreign decree",
          "description": "A foreign decree is issued by a court in another country. CCRO will review the applicable court papers.",
          "blocksProgress": false
        }},
        {"value": "annulment_nullity", "label": "Annulment / Declaration of nullity of marriage"},
        {"value": "legal_separation", "label": "Legal separation", "notice": {
          "variant": "warning", "title": "Visit CCRO for legal separation",
          "description": "Legal separation is listed in the Citizen's Charter, but its registration fee is not specified. Bring the applicable certified court decision and finality or judgment documents to CCRO for assessment. Online submission is unavailable for this case.",
          "blocksProgress": true
        }}
      ]
    }],
    "outcomes": [
      {"serviceCode": "COURT-FOREIGN-ADOPTION", "when": {"match": "any", "conditions": [
        {"field": "court_decree_type", "operator": "equals", "value": "adoption"},
        {"field": "court_decree_type", "operator": "equals", "value": "foreign_decree"}
      ]}},
      {"serviceCode": "COURT-ANNULMENT", "when": {"match": "all", "conditions": [
        {"field": "court_decree_type", "operator": "equals", "value": "annulment_nullity"}
      ]}}
    ]
  }
  $json$::jsonb);
  if next_definition = template_row.definition then return; end if;
  select coalesce(max(version), 0) + 1 into next_version
  from public.form_template_versions where template_id = template_row.id;
  insert into public.form_template_versions(template_id, version, status, definition, published_at)
  values(template_row.id, next_version, 'published', next_definition, now())
  returning id into published_id;
  update public.form_templates set active_version_id = published_id, updated_at = now()
  where id = template_row.id;
end $$;
