-- Add covering indexes for unindexed foreign keys and hot-path lookup columns.
--
-- Two groups here:
--
-- 1. Foreign keys without a covering index. Postgres does not index the
--    referencing side of an FK automatically, so every DELETE/UPDATE on the
--    referenced table has to sequentially scan the child table to enforce the
--    constraint, and every join across the FK loses the index path.
--
-- 2. Columns the service catalogue filters on. `services_registry.display_group`
--    and `service_requirements_metadata.requirement_group` are read on every
--    checklist view, requirements popup, and services listing, but neither had
--    an index — those reads were sequential scans.
--
-- All additive: no existing index, constraint, or policy is changed.

-- ─── Foreign keys ────────────────────────────────────────────────────────────

create index if not exists idx_application_logs_performed_by_profile_id
  on public.application_logs (performed_by_profile_id);

create index if not exists idx_appointments_time_slot_id
  on public.appointments (time_slot_id);

create index if not exists idx_profiles_suspended_by
  on public.profiles (suspended_by);

create index if not exists idx_queue_tickets_appointment_id
  on public.queue_tickets (appointment_id);

create index if not exists idx_queue_tickets_counter_id
  on public.queue_tickets (counter_id);

create index if not exists idx_queue_tickets_issued_by
  on public.queue_tickets (issued_by);

create index if not exists idx_queue_tickets_request_id
  on public.queue_tickets (request_id);

create index if not exists idx_system_audit_events_target_profile_id
  on public.system_audit_events (target_profile_id);

create index if not exists idx_system_operational_events_related_audit_event_id
  on public.system_operational_events (related_audit_event_id);

create index if not exists idx_system_security_events_actor_profile_id
  on public.system_security_events (actor_profile_id);

create index if not exists idx_system_security_findings_acknowledged_by
  on public.system_security_findings (acknowledged_by);

create index if not exists idx_system_security_findings_resolved_by
  on public.system_security_findings (resolved_by);

create index if not exists idx_system_security_findings_subject_profile_id
  on public.system_security_findings (subject_profile_id);

-- ─── Service catalogue hot paths ─────────────────────────────────────────────

-- `getServices`, `getServiceDetail`, and `getServiceOverview` all resolve a card
-- to its case(s) through `display_group`.
create index if not exists idx_services_registry_display_group
  on public.services_registry (display_group);

-- Requirement checklists are looked up by `requirement_group` at least as often
-- as by `service_code`, which was the only one of the pair that had an index.
create index if not exists idx_svc_req_meta_requirement_group
  on public.service_requirements_metadata (requirement_group);

-- Refresh planner statistics so the new indexes are costed correctly straight
-- away instead of waiting for the next autovacuum pass.
analyze public.services_registry;
analyze public.service_requirements_metadata;
