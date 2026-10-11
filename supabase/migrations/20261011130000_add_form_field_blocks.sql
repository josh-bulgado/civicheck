-- Shared form-field blocks.
--
-- Several form templates carry identical copies of the same questions
-- (purpose, additional notes, contact number, the birth informant trio...), so
-- the CCRO admin had to edit each template separately. A block is one
-- admin-maintained group of questions; templates include it by copying the
-- fields (tagged with `blockKey`) into their own published definition.
--
-- Published template versions stay fully materialized and immutable: nothing
-- resolves a block at read time, so an existing request can always be
-- interpreted with the exact form it was submitted under. Editing a block
-- publishes a new version of every template that includes it, atomically,
-- through publish_form_template_versions below.

create table public.form_field_blocks (
  id uuid primary key default gen_random_uuid(),
  block_key text not null unique
    check (block_key ~ '^[a-z][a-z0-9_]*$'),
  name text not null,
  description text,
  step text not null check (step in ('case', 'details')),
  fields jsonb not null check (jsonb_typeof(fields) = 'array'),
  version integer not null default 1 check (version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.form_field_blocks is
  'Reusable groups of application-form questions. Copied (tagged with blockKey) into form_template_versions.definition; never resolved at read time.';

alter table public.form_field_blocks enable row level security;

-- Only the administrators who can edit form templates can see or change blocks;
-- applicants and staff only ever read the materialized template definitions.
create policy "Administrators can manage form field blocks"
  on public.form_field_blocks for all to authenticated
  using (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text in ('admin', 'system_admin')
        and profile.access_status = 'active'
    )
  );

-- Publish new immutable versions for several templates in ONE transaction.
--
-- items: [{ template_id, expected_active_version_id, definition }]
--
-- expected_active_version_id is an optimistic-concurrency guard: if another
-- admin published a template between the fan-out being computed and now, the
-- whole call fails instead of silently overwriting their change. Runs as the
-- caller (security invoker), so the admin RLS policies on form_templates and
-- form_template_versions still apply.
create or replace function public.publish_form_template_versions(items jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  item jsonb;
  current_active uuid;
  next_version integer;
  new_version_id uuid;
  results jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(items) <> 'array' then
    raise exception 'items must be a json array';
  end if;

  for item in select * from jsonb_array_elements(items)
  loop
    select active_version_id
    into current_active
    from public.form_templates
    where id = (item->>'template_id')::uuid
    for update;

    if not found then
      raise exception 'Form template % not found', item->>'template_id';
    end if;

    if current_active is distinct from (item->>'expected_active_version_id')::uuid then
      raise exception 'Form template % changed while the update was being prepared. Reload and try again.',
        item->>'template_id'
        using errcode = '40001';
    end if;

    select coalesce(max(version), 0) + 1
    into next_version
    from public.form_template_versions
    where template_id = (item->>'template_id')::uuid;

    insert into public.form_template_versions (
      template_id, version, status, definition,
      created_by, published_by, published_at
    ) values (
      (item->>'template_id')::uuid,
      next_version,
      'published',
      item->'definition',
      auth.uid(),
      auth.uid(),
      now()
    ) returning id into new_version_id;

    update public.form_templates
    set active_version_id = new_version_id, updated_at = now()
    where id = (item->>'template_id')::uuid;

    results := results || jsonb_build_object(
      'template_id', item->>'template_id',
      'version_id', new_version_id,
      'version', next_version
    );
  end loop;

  return results;
end;
$$;

revoke all on function public.publish_form_template_versions(jsonb) from public, anon;
grant execute on function public.publish_form_template_versions(jsonb) to authenticated;
