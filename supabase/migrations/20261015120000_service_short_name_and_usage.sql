-- A short display name for each service, and a per-service request count.
--
-- short_name
--   The applicant's service cards are four across, so a registry name such as
--   "Application for Late Registration of Birth with Affidavit" does not fit a
--   card title. `short_name` is what the card (and the dashboard headline)
--   shows instead. Nullable: where it is empty the full display name is used.
--   Nothing is seeded, because the wording is the CCRO's to choose; an admin
--   sets it in the service editor.
--
-- service_request_counts()
--   Backs the "Most used first" sort. Applicants can only read their own
--   requests, so the count has to be taken with the definer's rights. It
--   returns one number per service and nothing else: no ids, no applicants.

alter table public.services_registry
  add column if not exists short_name text;

alter table public.services_registry
  drop constraint if exists services_registry_short_name_check;
alter table public.services_registry
  add constraint services_registry_short_name_check
  check (
    short_name is null
    or (btrim(short_name) <> '' and char_length(short_name) <= 40)
  );

comment on column public.services_registry.short_name is
  'Short title for the applicant service cards and dashboard headline. Null = use display_name.';

-- ─── Save function ───────────────────────────────────────────────────────────
-- Same function as before, plus `short_name` on create and update.
create or replace function public.save_service_configuration(
  p_service_code text,
  p_create boolean,
  p_service jsonb,
  p_requirements jsonb,
  p_form jsonb
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  saved public.services_registry%rowtype;
  group_key text;
  owner_code text;
  template_ref uuid;
  first_binding boolean := false;
  active_ref uuid;
  active_definition jsonb;
  active_number integer;
  next_number integer;
  form_result jsonb := null;
begin
  if p_service is null then
    if p_create then
      raise exception 'A new service needs its registry details.';
    end if;

    select *
    into saved
    from public.services_registry
    where service_code = p_service_code;

    if not found then
      raise exception 'Service "%" was not found.', p_service_code
        using errcode = 'P0002';
    end if;
  elsif p_create then
    if exists (
      select 1 from public.services_registry where service_code = p_service_code
    ) then
      raise exception 'A service with the code "%" already exists.', p_service_code
        using errcode = '23505';
    end if;

    insert into public.services_registry (
      service_code, name, classification, fee, processing_time, department_id,
      steps_description, party_roles,
      event_date_label, event_place_label, event_date_direction,
      reference_number_label, asks_purpose, asks_birth_details,
      allows_messages,
      display_group, display_name, short_name, requirement_group, fee_components
    ) values (
      p_service_code,
      p_service->>'name',
      p_service->>'classification',
      (p_service->>'fee')::numeric,
      p_service->>'processing_time',
      nullif(p_service->>'department_id', ''),
      array(
        select entry.value
        from jsonb_array_elements_text(
          coalesce(p_service->'steps_description', '[]'::jsonb)
        ) with ordinality as entry(value, ordinal)
        order by entry.ordinal
      ),
      array(
        select entry.value
        from jsonb_array_elements_text(
          coalesce(p_service->'party_roles', '[]'::jsonb)
        ) with ordinality as entry(value, ordinal)
        order by entry.ordinal
      ),
      nullif(p_service->>'event_date_label', ''),
      nullif(p_service->>'event_place_label', ''),
      coalesce(p_service->>'event_date_direction', 'past'),
      nullif(p_service->>'reference_number_label', ''),
      coalesce((p_service->>'asks_purpose')::boolean, true),
      coalesce((p_service->>'asks_birth_details')::boolean, false),
      coalesce((p_service->>'allows_messages')::boolean, false),
      nullif(p_service->>'display_group', ''),
      nullif(p_service->>'display_name', ''),
      nullif(btrim(p_service->>'short_name'), ''),
      nullif(p_service->>'requirement_group', ''),
      coalesce(p_service->'fee_components', '[]'::jsonb)
    )
    returning * into saved;
  else
    update public.services_registry
    set name = p_service->>'name',
        classification = p_service->>'classification',
        fee = (p_service->>'fee')::numeric,
        processing_time = p_service->>'processing_time',
        department_id = nullif(p_service->>'department_id', ''),
        steps_description = array(
          select entry.value
          from jsonb_array_elements_text(
            coalesce(p_service->'steps_description', '[]'::jsonb)
          ) with ordinality as entry(value, ordinal)
          order by entry.ordinal
        ),
        party_roles = array(
          select entry.value
          from jsonb_array_elements_text(
            coalesce(p_service->'party_roles', '[]'::jsonb)
          ) with ordinality as entry(value, ordinal)
          order by entry.ordinal
        ),
        event_date_label = nullif(p_service->>'event_date_label', ''),
        event_place_label = nullif(p_service->>'event_place_label', ''),
        event_date_direction = coalesce(p_service->>'event_date_direction', 'past'),
        reference_number_label = nullif(p_service->>'reference_number_label', ''),
        asks_purpose = coalesce((p_service->>'asks_purpose')::boolean, true),
        asks_birth_details = coalesce((p_service->>'asks_birth_details')::boolean, false),
        -- A save that does not carry the switch keeps whatever it is now.
        allows_messages = coalesce((p_service->>'allows_messages')::boolean, allows_messages),
        display_group = nullif(p_service->>'display_group', ''),
        display_name = nullif(p_service->>'display_name', ''),
        -- A save that does not carry the key keeps the stored short name; an
        -- empty one clears it.
        short_name = case
          when p_service ? 'short_name' then nullif(btrim(p_service->>'short_name'), '')
          else short_name
        end,
        requirement_group = nullif(p_service->>'requirement_group', ''),
        -- A save that does not carry the breakdown keeps the stored one.
        fee_components = coalesce(p_service->'fee_components', fee_components)
    where service_code = p_service_code
    returning * into saved;

    -- RLS hides the row from anyone who may not edit it, so "not found" also
    -- covers "not allowed" — either way nothing below may run.
    if not found then
      raise exception 'Service "%" was not found, or you are not allowed to edit it.',
        p_service_code
        using errcode = 'P0002';
    end if;
  end if;

  -- ─── Checklist ─────────────────────────────────────────────────────────────
  if p_requirements is not null then
    if jsonb_typeof(p_requirements) <> 'array' then
      raise exception 'requirements must be a json array';
    end if;

    -- Group-owned rows (a checklist shared by several services) carry the group
    -- and no service code; service-owned rows carry both, and they are equal.
    group_key := coalesce(nullif(saved.requirement_group, ''), saved.service_code);
    owner_code := case
      when group_key = saved.service_code then saved.service_code
      else null
    end;

    -- "This checklist" is the same set the editor loaded: every row on the
    -- group key or on this service's code. An id from outside it is never
    -- matched, so one checklist cannot take over another's rows.
    delete from public.service_requirements_metadata existing
    where (
        existing.requirement_group = group_key
        or existing.service_code = saved.service_code
      )
      and not exists (
        select 1
        from jsonb_array_elements(p_requirements) as incoming(item)
        where incoming.item->>'id' = existing.id::text
      );

    update public.service_requirements_metadata existing
    set service_code = owner_code,
        requirement_group = group_key,
        requirement_name = incoming.item->>'requirement_name',
        where_to_secure = nullif(incoming.item->>'where_to_secure', ''),
        case_tag = nullif(incoming.item->>'case_tag', ''),
        applies_when = case
          when jsonb_typeof(incoming.item->'applies_when') = 'object'
            then incoming.item->'applies_when'
        end,
        is_mandatory = coalesce((incoming.item->>'is_mandatory')::boolean, true),
        requires_upload = coalesce((incoming.item->>'requires_upload')::boolean, true),
        upload_scope = coalesce(incoming.item->>'upload_scope', 'request'),
        subject_role = nullif(incoming.item->>'subject_role', ''),
        sort_order = incoming.ordinal
    from jsonb_array_elements(p_requirements)
      with ordinality as incoming(item, ordinal)
    where incoming.item->>'id' = existing.id::text
      and (
        existing.requirement_group = group_key
        or existing.service_code = saved.service_code
      );

    insert into public.service_requirements_metadata (
      service_code, requirement_group, requirement_name, where_to_secure,
      case_tag, applies_when, is_mandatory, requires_upload, upload_scope,
      subject_role, sort_order
    )
    select
      owner_code,
      group_key,
      incoming.item->>'requirement_name',
      nullif(incoming.item->>'where_to_secure', ''),
      nullif(incoming.item->>'case_tag', ''),
      case
        when jsonb_typeof(incoming.item->'applies_when') = 'object'
          then incoming.item->'applies_when'
      end,
      coalesce((incoming.item->>'is_mandatory')::boolean, true),
      coalesce((incoming.item->>'requires_upload')::boolean, true),
      coalesce(incoming.item->>'upload_scope', 'request'),
      nullif(incoming.item->>'subject_role', ''),
      incoming.ordinal
    from jsonb_array_elements(p_requirements)
      with ordinality as incoming(item, ordinal)
    where not exists (
      select 1
      from public.service_requirements_metadata existing
      where existing.id::text = incoming.item->>'id'
        and (
          existing.requirement_group = group_key
          or existing.service_code = saved.service_code
        )
    )
    order by incoming.ordinal;
  end if;

  -- ─── Application form ──────────────────────────────────────────────────────
  if p_form is not null then
    select binding.template_id
    into template_ref
    from public.service_form_templates binding
    where binding.service_code = p_service_code;

    if template_ref is null then
      first_binding := true;

      -- A service that was deleted and created again finds the template its
      -- code left behind (the key is derived from the code) and carries on from
      -- that template's version history.
      insert into public.form_templates (template_key, name, created_by)
      values (p_form->>'template_key', p_form->>'template_name', auth.uid())
      on conflict (template_key)
        do update set name = excluded.name, updated_at = now()
      returning id into template_ref;

      insert into public.service_form_templates (service_code, template_id)
      values (p_service_code, template_ref);
    end if;

    select template.active_version_id
    into active_ref
    from public.form_templates template
    where template.id = template_ref
    for update;

    if not first_binding
      and active_ref is distinct from (p_form->>'expected_version_id')::uuid
    then
      raise exception 'This application form was changed by someone else while you were editing it. Reload the page and try again.'
        using errcode = '40001';
    end if;

    if active_ref is not null then
      select form_version.definition, form_version.version
      into active_definition, active_number
      from public.form_template_versions form_version
      where form_version.id = active_ref;
    end if;

    if active_ref is not null and active_definition = p_form->'definition' then
      -- Nothing about the form changed. Publishing anyway would supersede the
      -- version applicants are filling in right now and bounce their submission.
      update public.form_templates
      set name = p_form->>'template_name', updated_at = now()
      where id = template_ref
        and name is distinct from p_form->>'template_name';

      form_result := jsonb_build_object(
        'version_id', active_ref,
        'version', active_number,
        'published', false
      );
    else
      select coalesce(max(form_version.version), 0) + 1
      into next_number
      from public.form_template_versions form_version
      where form_version.template_id = template_ref;

      insert into public.form_template_versions (
        template_id, version, status, definition,
        created_by, published_by, published_at
      ) values (
        template_ref,
        next_number,
        'published',
        p_form->'definition',
        auth.uid(),
        auth.uid(),
        now()
      )
      returning id into active_ref;

      update public.form_templates
      set name = p_form->>'template_name',
          active_version_id = active_ref,
          updated_at = now()
      where id = template_ref;

      form_result := jsonb_build_object(
        'version_id', active_ref,
        'version', next_number,
        'published', true
      );
    end if;
  end if;

  return jsonb_build_object('service', to_jsonb(saved), 'form', form_result);
end;
$$;

revoke all on function public.save_service_configuration(text, boolean, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_service_configuration(text, boolean, jsonb, jsonb, jsonb)
  to authenticated;

-- ─── Usage counts ────────────────────────────────────────────────────────────
create or replace function public.service_request_counts()
returns table (service_code text, request_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select r.request_type::text, count(*)::bigint
  from public.requests r
  where r.request_type is not null
  group by r.request_type
$$;

revoke all on function public.service_request_counts() from public, anon;
grant execute on function public.service_request_counts() to authenticated;
