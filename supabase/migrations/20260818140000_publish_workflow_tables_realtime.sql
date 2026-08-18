-- Stream the whole request workflow, not just the account directory, so every
-- dashboard reflects other people's work without a reload.
--
-- Publishing a table does NOT widen access: Realtime evaluates each change
-- against the subscriber's own RLS policies before delivering it. A viewer who
-- cannot SELECT a row never sees its events. No policy is changed here — the
-- existing is_ccro_staff() / owner-scoped SELECT policies decide who receives
-- what, which is why system_admin still sees nothing from `requests` (account
-- oversight deliberately stops short of citizen submissions).

do $$
declare
  target text;
begin
  foreach target in array array[
    'requests',                 -- the five workflow stages
    'application_logs',         -- per-request status history
    'requirements_attachments', -- pre-validation uploads
    'notifications',            -- in-system notification feed
    'services_registry',        -- admin service configuration
    'service_requirements_metadata',
    'system_audit_events'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', target
      );
    end if;
  end loop;
end
$$;
