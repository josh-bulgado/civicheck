-- The office announcement and managed rejection-preset features were withdrawn.
-- Preserve their existing data outside the exposed API schemas. Historical
-- rejection messages in requests and attachments are intentionally untouched.
create schema retired_office_configuration;
revoke all on schema retired_office_configuration from public, anon, authenticated, service_role;
comment on schema retired_office_configuration is
  'Private archive of withdrawn office announcements and managed rejection presets.';

drop trigger check_advisory_targets on public.office_advisories;
drop trigger check_advisory_service_targets on public.office_advisory_services;
drop trigger stamp_office_advisories on public.office_advisories;
drop trigger stamp_document_rejection_presets on public.document_rejection_presets;

drop function public.save_office_advisory(jsonb, text[], uuid, timestamptz);
drop function public.check_office_advisory_targets();
drop function public.stamp_office_configuration();

do $$
declare
  feature_table text;
  policy_name text;
  column_names text;
begin
  foreach feature_table in array array[
    'office_advisories',
    'office_advisory_services',
    'office_advisory_dismissals',
    'document_rejection_presets'
  ] loop
    for policy_name in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = feature_table
    loop
      execute format('drop policy %I on public.%I', policy_name, feature_table);
    end loop;

    execute format(
      'revoke all privileges on table public.%I from public, anon, authenticated, service_role',
      feature_table
    );
    -- Table-level REVOKE does not remove the explicit column grants.
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
      into column_names
      from information_schema.columns
      where table_schema = 'public' and table_name = feature_table;
    execute format(
      'revoke all privileges (%s) on table public.%I from public, anon, authenticated, service_role',
      column_names, feature_table
    );
    execute format(
      'alter table public.%I set schema retired_office_configuration',
      feature_table
    );
  end loop;
end;
$$;
