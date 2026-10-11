-- Save a shared form-field block and publish the resulting template versions in
-- ONE transaction.
--
-- The application computes (and zod-validates) the next definition of every
-- template that includes the block, then hands them over as p_items. Doing the
-- block upsert and the template fan-out in a single call means a failure can
-- never leave the block edited while the forms still show the old questions.
--
-- Runs as the caller (security invoker): the admin RLS policies on
-- form_field_blocks / form_templates / form_template_versions still apply.

create or replace function public.save_form_field_block(
  p_block jsonb,
  p_items jsonb,
  p_expected_version integer default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  existing public.form_field_blocks%rowtype;
  saved_version integer;
  published jsonb := '[]'::jsonb;
begin
  select *
  into existing
  from public.form_field_blocks
  where block_key = p_block->>'block_key'
  for update;

  if found then
    if p_expected_version is not null and existing.version <> p_expected_version then
      raise exception 'Shared block "%" was changed by someone else. Reload and try again.',
        p_block->>'block_key'
        using errcode = '40001';
    end if;

    update public.form_field_blocks
    set name = p_block->>'name',
        description = p_block->>'description',
        step = p_block->>'step',
        fields = p_block->'fields',
        version = existing.version + 1,
        updated_by = auth.uid(),
        updated_at = now()
    where id = existing.id
    returning version into saved_version;
  else
    insert into public.form_field_blocks (
      block_key, name, description, step, fields, created_by, updated_by
    ) values (
      p_block->>'block_key',
      p_block->>'name',
      p_block->>'description',
      p_block->>'step',
      p_block->'fields',
      auth.uid(),
      auth.uid()
    ) returning version into saved_version;
  end if;

  if jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    published := public.publish_form_template_versions(p_items);
  end if;

  return jsonb_build_object('version', saved_version, 'published', published);
end;
$$;

revoke all on function public.save_form_field_block(jsonb, jsonb, integer) from public, anon;
grant execute on function public.save_form_field_block(jsonb, jsonb, integer) to authenticated;
