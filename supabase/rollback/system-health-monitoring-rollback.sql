-- Rolls back 20261024120000_system_health_monitoring.sql and 20261024120100_system_health_schedule.sql.
-- Run by hand. Check data is metadata only, but dropping the columns loses the new outcome history.

-- 1. Switch the schedule off, if it was installed.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobname) from cron.job where jobname in ('system-health-probe', 'system-health-prune');
  end if;
end $$;

drop function if exists public.system_health_remove_schedule();
drop function if exists public.system_health_install_schedule();
drop function if exists public.system_health_prepare_secrets(text);

-- 2. Functions.
drop function if exists public.system_health_record_run(text, uuid, timestamptz, jsonb);
drop function if exists public.system_health_record_job_failure(timestamptz, text);
drop function if exists public.system_health_summary();
drop function if exists public.system_health_series(integer);
drop function if exists public.system_health_attention();
drop function if exists public.system_health_record_maintenance(uuid, text, text, text, timestamptz, timestamptz, text, text);
drop function if exists public.system_health_acknowledge_event(uuid, uuid, text, text);
drop function if exists public.system_health_update_limits(uuid, jsonb, text, text);
drop function if exists public.system_health_audit_manual_run(uuid, text, text);
drop function if exists public.system_health_set_alerts(uuid, boolean, text, text);
drop function if exists public.system_health_claim_alert();
drop function if exists public.system_health_prune();

-- 3. Events and snapshots: remove what this migration added.
drop index if exists public.system_operational_events_one_open_degradation;
drop index if exists public.system_operational_events_maintenance_idx;
alter table public.system_operational_events
  drop constraint if exists system_operational_events_window_check,
  drop column if exists acknowledged_by,
  drop column if exists acknowledged_at,
  drop column if exists planned_start,
  drop column if exists planned_end,
  drop column if exists created_by;

alter table public.system_health_snapshots
  drop constraint if exists system_health_snapshots_component_fk,
  drop column if exists outcome,
  drop column if exists run_kind,
  drop column if exists triggered_by,
  drop column if exists object_count,
  drop column if exists total_bytes;
drop index if exists public.system_health_snapshots_recorded_idx;

-- 4. Tables. Remove rows the new design wrote before restoring the old three-key check.
drop table if exists public.system_health_settings;
drop table if exists public.system_health_components;
delete from public.system_health_snapshots where component_key not in ('database', 'authentication', 'storage');
alter table public.system_health_snapshots
  add constraint system_health_snapshots_component_key_check
  check (component_key = any (array['database', 'authentication', 'storage']));

-- 5. Audit event types: restore the list from before.
delete from public.system_audit_events
where event_type in ('health_check_run', 'health_maintenance_recorded', 'health_event_acknowledged',
                     'health_limits_updated', 'health_settings_updated');
alter table public.system_audit_events drop constraint if exists system_audit_events_event_type_check;
alter table public.system_audit_events
  add constraint system_audit_events_event_type_check check (event_type = any (array[
    'staff_invited', 'invitation_resent', 'invitation_cancelled', 'role_changed',
    'account_suspended', 'account_reactivated', 'staff_deactivated', 'staff_reactivated',
    'ccro_admin_replaced', 'ccro_admin_appointed', 'security_finding_acknowledged',
    'security_finding_assigned', 'security_finding_resolved', 'security_control_reviewed',
    'account_details_updated', 'password_reset_sent', 'sessions_revoked', 'verification_resent',
    'service_created', 'service_updated', 'service_deleted', 'service_form_published',
    'password_changed'
  ]::text[]));
