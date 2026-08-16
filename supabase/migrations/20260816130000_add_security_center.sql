-- Metadata-only security posture for the System Administrator Security Center.
-- Citizen submissions, document metadata, raw email addresses, passwords,
-- tokens, request payloads, and full IP addresses are prohibited here.

create table if not exists public.system_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'sign_in_failed', 'admin_session_started'
  )),
  risk_level text not null default 'low' check (risk_level in (
    'critical', 'high', 'medium', 'low'
  )),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  subject_fingerprint text check (
    subject_fingerprint is null or length(subject_fingerprint) = 64
  ),
  summary text not null check (length(summary) between 1 and 240),
  occurred_at timestamptz not null default now()
);

comment on table public.system_security_events is
  'Redacted authentication and administrator-session signals. Never store raw identifiers, IP addresses, citizen data, document data, credentials, or request payloads.';

create index if not exists system_security_events_occurred_idx
  on public.system_security_events(occurred_at desc);
create index if not exists system_security_events_type_occurred_idx
  on public.system_security_events(event_type, occurred_at desc);
create index if not exists system_security_events_fingerprint_idx
  on public.system_security_events(subject_fingerprint, occurred_at desc)
  where subject_fingerprint is not null;

create table if not exists public.system_security_findings (
  id uuid primary key default gen_random_uuid(),
  finding_key text not null unique check (length(finding_key) between 1 and 180),
  category text not null check (category in (
    'authentication', 'privileged_access', 'policy'
  )),
  severity text not null check (severity in (
    'critical', 'high', 'medium', 'low'
  )),
  title text not null check (length(title) between 1 and 120),
  summary text not null check (length(summary) between 1 and 500),
  status text not null default 'open' check (status in (
    'open', 'acknowledged', 'resolved'
  )),
  subject_profile_id uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  detected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolution_note text check (
    resolution_note is null or length(trim(resolution_note)) between 10 and 500
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_security_findings_lifecycle_check check (
    (status = 'open' and acknowledged_at is null and resolved_at is null)
    or
    (status = 'acknowledged' and acknowledged_at is not null and resolved_at is null)
    or
    (status = 'resolved' and resolved_at is not null and resolution_note is not null)
  )
);

comment on table public.system_security_findings is
  'Actionable security metadata only. Finding summaries must never contain protected citizen or case content.';

create index if not exists system_security_findings_status_idx
  on public.system_security_findings(status, severity, last_seen_at desc);
create index if not exists system_security_findings_assigned_idx
  on public.system_security_findings(assigned_to, status);

create table if not exists public.system_security_controls (
  control_key text primary key check (length(control_key) between 1 and 80),
  category text not null check (category in (
    'identity', 'access', 'credentials', 'audit'
  )),
  name text not null check (length(name) between 1 and 120),
  description text not null check (length(description) between 1 and 500),
  status text not null check (status in (
    'enforced', 'monitoring', 'review_due', 'action_required'
  )),
  evidence_summary text not null check (length(evidence_summary) between 1 and 500),
  review_interval_days integer not null default 90 check (
    review_interval_days between 1 and 3650
  ),
  last_reviewed_at timestamptz,
  next_review_due_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.system_security_controls is
  'Configurable security control status and review reminders. Secret values and credentials are prohibited.';

insert into public.system_security_controls (
  control_key,
  category,
  name,
  description,
  status,
  evidence_summary,
  review_interval_days,
  last_reviewed_at,
  next_review_due_at
) values
  (
    'privileged-server-boundaries',
    'access',
    'Privileged server boundaries',
    'System administration reads and changes require an active role and an explicit permission at the server boundary.',
    'enforced',
    'Protected server functions verify the current session before using service-role access.',
    90,
    now(),
    now() + interval '90 days'
  ),
  (
    'append-only-audit-history',
    'audit',
    'Sensitive action audit history',
    'Privileged account and security-finding changes are appended to the Audit Center.',
    'enforced',
    'Authenticated clients cannot insert, update, or delete system audit events.',
    90,
    now(),
    now() + interval '90 days'
  ),
  (
    'privileged-access-review',
    'identity',
    'Privileged access review',
    'Active administrative assignments and recent sign-in activity are reviewed on a recurring schedule.',
    'monitoring',
    'The Security Center flags privileged accounts with no sign-in for 90 days.',
    30,
    now(),
    now() + interval '30 days'
  ),
  (
    'service-credential-rotation',
    'credentials',
    'Service credential rotation',
    'Operational credentials are reviewed and rotated according to the approved platform schedule.',
    'review_due',
    'Confirm the next rotation date without storing credential values in CiviCheck.',
    90,
    null,
    now()
  )
on conflict (control_key) do nothing;

alter table public.system_security_events enable row level security;
alter table public.system_security_findings enable row level security;
alter table public.system_security_controls enable row level security;

grant select on public.system_security_events to authenticated;
grant select on public.system_security_findings to authenticated;
grant select on public.system_security_controls to authenticated;
grant all on public.system_security_events to service_role;
grant all on public.system_security_findings to service_role;
grant all on public.system_security_controls to service_role;

revoke insert, update, delete, truncate
  on public.system_security_events from authenticated, anon;
revoke insert, update, delete, truncate
  on public.system_security_findings from authenticated, anon;
revoke insert, update, delete, truncate
  on public.system_security_controls from authenticated, anon;

drop policy if exists "System administrators can read security events"
  on public.system_security_events;
create policy "System administrators can read security events"
  on public.system_security_events for select to authenticated
  using (public.is_active_system_administrator());

drop policy if exists "System administrators can read security findings"
  on public.system_security_findings;
create policy "System administrators can read security findings"
  on public.system_security_findings for select to authenticated
  using (public.is_active_system_administrator());

drop policy if exists "System administrators can read security controls"
  on public.system_security_controls;
create policy "System administrators can read security controls"
  on public.system_security_controls for select to authenticated
  using (public.is_active_system_administrator());

alter table public.system_audit_events
  drop constraint if exists system_audit_events_event_type_check;
alter table public.system_audit_events
  add constraint system_audit_events_event_type_check check (event_type in (
    'staff_invited', 'invitation_resent', 'invitation_cancelled',
    'role_changed', 'account_suspended', 'account_reactivated',
    'staff_deactivated', 'staff_reactivated', 'ccro_admin_replaced',
    'security_finding_acknowledged', 'security_finding_assigned',
    'security_finding_resolved', 'security_control_reviewed'
  ));

create or replace function public.manage_system_security_finding(
  finding_id uuid,
  finding_action text,
  assignee_id uuid default null,
  resolution text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  audit_event_type text;
  audit_target_id uuid;
begin
  if not public.is_active_system_administrator() then
    raise exception 'Forbidden';
  end if;

  if not exists (select 1 from system_security_findings where id = finding_id) then
    raise exception 'Security finding not found';
  end if;

  if finding_action = 'acknowledge' then
    update system_security_findings
    set status = 'acknowledged',
        assigned_to = coalesce(assigned_to, actor_id),
        acknowledged_at = coalesce(acknowledged_at, now()),
        acknowledged_by = coalesce(acknowledged_by, actor_id),
        updated_at = now()
    where id = finding_id and status <> 'resolved';
    audit_event_type := 'security_finding_acknowledged';
  elsif finding_action = 'assign' then
    if assignee_id is null or not exists (
      select 1 from profiles
      where id = assignee_id
        and role::text = 'system_admin'
        and access_status = 'active'
    ) then
      raise exception 'Assignee must be an active System Administrator';
    end if;
    update system_security_findings
    set assigned_to = assignee_id, updated_at = now()
    where id = finding_id and status <> 'resolved';
    audit_event_type := 'security_finding_assigned';
    audit_target_id := assignee_id;
  elsif finding_action = 'resolve' then
    if resolution is null or length(trim(resolution)) < 10 then
      raise exception 'A resolution note of at least 10 characters is required';
    end if;
    update system_security_findings
    set status = 'resolved',
        assigned_to = coalesce(assigned_to, actor_id),
        acknowledged_at = coalesce(acknowledged_at, now()),
        acknowledged_by = coalesce(acknowledged_by, actor_id),
        resolved_at = now(),
        resolved_by = actor_id,
        resolution_note = trim(resolution),
        updated_at = now()
    where id = finding_id and status <> 'resolved';
    audit_event_type := 'security_finding_resolved';
  else
    raise exception 'Unsupported security finding action';
  end if;

  if not found then
    raise exception 'Resolved findings cannot be changed';
  end if;

  insert into system_audit_events (
    event_type, actor_profile_id, target_profile_id, metadata
  ) values (
    audit_event_type,
    actor_id,
    audit_target_id,
    jsonb_build_object('finding_id', finding_id)
  );
end;
$$;

revoke all on function public.manage_system_security_finding(uuid, text, uuid, text)
  from public, anon;
grant execute on function public.manage_system_security_finding(uuid, text, uuid, text)
  to authenticated;

create or replace function public.review_system_security_control(
  requested_control_key text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if not public.is_active_system_administrator() then
    raise exception 'Forbidden';
  end if;

  update system_security_controls
  set status = case when status = 'action_required' then status else 'enforced' end,
      last_reviewed_at = now(),
      next_review_due_at = now() + make_interval(days => review_interval_days),
      updated_at = now()
  where control_key = requested_control_key;

  if not found then
    raise exception 'Security control not found';
  end if;

  update system_security_findings
  set status = 'resolved',
      assigned_to = coalesce(assigned_to, actor_id),
      acknowledged_at = coalesce(acknowledged_at, now()),
      acknowledged_by = coalesce(acknowledged_by, actor_id),
      resolved_at = now(),
      resolved_by = actor_id,
      resolution_note = 'Security control review recorded.',
      updated_at = now()
  where finding_key like 'security-control-review:' || requested_control_key || ':%'
    and status <> 'resolved';

  insert into system_audit_events (
    event_type, actor_profile_id, metadata
  ) values (
    'security_control_reviewed',
    actor_id,
    jsonb_build_object('control_key', requested_control_key)
  );
end;
$$;

revoke all on function public.review_system_security_control(text)
  from public, anon;
grant execute on function public.review_system_security_control(text)
  to authenticated;
