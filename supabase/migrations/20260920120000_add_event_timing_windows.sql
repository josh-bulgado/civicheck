-- Data-driven on-time registration windows.
--
-- The Birth and Marriage forms used to hardcode a 30-day check inside the
-- apply wizard. This moves the rule into the already-versioned form template
-- definition as `eventTiming`, so any service (grouped or standalone) can
-- declare its own window, routing target, and applicant-facing copy without a
-- code change. On-time is `event_date + windowDays`, inclusive, measured in
-- whole days to avoid month-length and leap-year ambiguity.
--
-- Each template gets a new published version (existing published versions are
-- immutable); the group/standalone representative is found by `template_key`.
-- The full period is configurable in the admin editor afterward.

do $$
declare
  rules jsonb := $json$
  [
    {
      "template_key": "birth_ontime",
      "rule": {
        "triggerField": "event_date",
        "windowDays": 30,
        "mismatch": "outside_window",
        "targetServiceCode": "birth_delayed",
        "behavior": "redirect_confirm",
        "requireDocumentFirst": false,
        "timezone": "Asia/Manila",
        "title": "This date is more than 30 days ago",
        "description": "Use the registration track that matches the birth date.",
        "ctaLabel": "Switch to Delayed Registration"
      }
    },
    {
      "template_key": "birth_delayed",
      "rule": {
        "triggerField": "event_date",
        "windowDays": 30,
        "mismatch": "inside_window",
        "targetServiceCode": "birth_ontime",
        "behavior": "redirect_confirm",
        "requireDocumentFirst": false,
        "timezone": "Asia/Manila",
        "title": "This date is within the last 30 days",
        "description": "Use the registration track that matches the birth date.",
        "ctaLabel": "Switch to On-Time Registration"
      }
    },
    {
      "template_key": "marriage_ontime",
      "rule": {
        "triggerField": "event_date",
        "windowDays": 30,
        "mismatch": "outside_window",
        "targetServiceCode": "MARRIAGE_DELAYED",
        "behavior": "redirect_confirm",
        "requireDocumentFirst": false,
        "timezone": "Asia/Manila",
        "title": "This date is more than 30 days ago",
        "description": "Use the registration track that matches the marriage date.",
        "ctaLabel": "Switch to Delayed Registration"
      }
    },
    {
      "template_key": "marriage_delayed",
      "rule": {
        "triggerField": "event_date",
        "windowDays": 30,
        "mismatch": "inside_window",
        "targetServiceCode": "MARRIAGE_ONTIME",
        "behavior": "redirect_confirm",
        "requireDocumentFirst": false,
        "timezone": "Asia/Manila",
        "title": "This date is within the last 30 days",
        "description": "Use the registration track that matches the marriage date.",
        "ctaLabel": "Switch to On-Time Registration"
      }
    },
    {
      "template_key": "death_ontime",
      "rule": {
        "triggerField": "event_date",
        "windowDays": 30,
        "mismatch": "outside_window",
        "targetServiceCode": "DEATH_DELAYED",
        "behavior": "redirect_confirm",
        "requireDocumentFirst": false,
        "timezone": "Asia/Manila",
        "title": "This date is more than 30 days ago",
        "description": "Use the registration track that matches the death date.",
        "ctaLabel": "Switch to Delayed Registration"
      }
    },
    {
      "template_key": "death_delayed",
      "rule": {
        "triggerField": "event_date",
        "windowDays": 30,
        "mismatch": "inside_window",
        "targetServiceCode": "DEATH_ONTIME",
        "behavior": "redirect_confirm",
        "requireDocumentFirst": false,
        "timezone": "Asia/Manila",
        "title": "This date is within the last 30 days",
        "description": "Use the registration track that matches the death date.",
        "ctaLabel": "Switch to On-Time Registration"
      }
    }
  ]
  $json$::jsonb;
  entry jsonb;
  template_row record;
  next_version integer;
  published_id uuid;
begin
  for entry in select * from jsonb_array_elements(rules)
  loop
    select template.*, version.definition
    into template_row
    from public.form_templates template
    join public.form_template_versions version
      on version.id = template.active_version_id
    where template.template_key = entry->>'template_key';

    if not found then
      continue;
    end if;

    -- Idempotent: never re-version a template that already carries a rule.
    if jsonb_exists(template_row.definition, 'eventTiming') then
      continue;
    end if;

    select coalesce(max(version), 0) + 1
    into next_version
    from public.form_template_versions
    where template_id = template_row.id;

    insert into public.form_template_versions (
      template_id, version, status, definition, published_at
    ) values (
      template_row.id,
      next_version,
      'published',
      jsonb_set(template_row.definition, '{eventTiming}', entry->'rule', true),
      now()
    ) returning id into published_id;

    update public.form_templates
    set active_version_id = published_id, updated_at = now()
    where id = template_row.id;
  end loop;
end
$$;
