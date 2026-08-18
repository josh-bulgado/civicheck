-- replace_ccro_admin previously required an existing active CCRO Administrator
-- to demote, so there was no way to appoint the very first one (fresh
-- deployment) or recover if the seat is ever left empty. Make the outgoing
-- admin optional: when one exists, behave exactly as before (demote +
-- promote); when none exists, just promote the candidate.

alter table public.system_audit_events
  drop constraint if exists system_audit_events_event_type_check;
alter table public.system_audit_events
  add constraint system_audit_events_event_type_check check (event_type in (
    'staff_invited', 'invitation_resent', 'invitation_cancelled',
    'role_changed', 'account_suspended', 'account_reactivated',
    'staff_deactivated', 'staff_reactivated', 'ccro_admin_replaced',
    'ccro_admin_appointed',
    'security_finding_acknowledged', 'security_finding_assigned',
    'security_finding_resolved', 'security_control_reviewed'
  ));

create or replace function public.replace_ccro_admin(
  candidate_id uuid,
  outgoing_role text default null,
  outgoing_department_id text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  outgoing_id uuid;
  candidate_role text;
begin
  if not exists (
    select 1 from profiles
    where id = actor_id and role::text = 'system_admin' and access_status = 'active'
  ) then raise exception 'Forbidden'; end if;

  perform pg_advisory_xact_lock(hashtext('civicheck.ccro-admin-replacement'));
  select id into outgoing_id from profiles
    where role = 'admin' and access_status = 'active' for update;

  if outgoing_id is not null then
    if outgoing_id = candidate_id then raise exception 'Candidate is already the CCRO Administrator'; end if;
    if outgoing_role is null or outgoing_role not in ('staff', 'supervisor', 'cashier') then
      raise exception 'Invalid outgoing role';
    end if;
    if outgoing_role in ('staff', 'supervisor') and outgoing_department_id is null then
      raise exception 'A department is required for this outgoing role';
    end if;
    if outgoing_department_id is not null and not exists (
      select 1 from departments where id = outgoing_department_id and is_active
    ) then raise exception 'Invalid department'; end if;
  end if;

  select role into candidate_role from profiles
    where id = candidate_id and access_status = 'active' for update;
  if candidate_role not in ('staff', 'supervisor', 'cashier') then
    raise exception 'Candidate must be an active operational staff member';
  end if;

  if outgoing_id is not null then
    update profiles set role = outgoing_role,
      department_id = case when outgoing_role in ('staff', 'supervisor') then outgoing_department_id else null end
      where id = outgoing_id;
  end if;
  update profiles set role = 'admin', department_id = null where id = candidate_id;

  insert into system_audit_events(event_type, actor_profile_id, target_profile_id, metadata)
  values (
    case when outgoing_id is null then 'ccro_admin_appointed' else 'ccro_admin_replaced' end,
    actor_id, candidate_id,
    jsonb_build_object('outgoing_admin_id', outgoing_id, 'outgoing_role', outgoing_role)
  );
end;
$$;

revoke all on function public.replace_ccro_admin(uuid, text, text) from public;
grant execute on function public.replace_ccro_admin(uuid, text, text) to authenticated;
