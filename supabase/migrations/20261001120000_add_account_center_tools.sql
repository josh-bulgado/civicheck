-- Accounts Center tooling for System Administrators:
--   * new audit event types (password reset link, session revocation,
--     verification resend)
--   * account_details_updated, which updateAccountDetails already writes but the
--     previous constraint never allowed — every details edit failed at the audit
--     insert after the profile change had been saved
--   * revoke_user_sessions(), so an account can be signed out everywhere

alter table public.system_audit_events
  drop constraint if exists system_audit_events_event_type_check;
alter table public.system_audit_events
  add constraint system_audit_events_event_type_check check (event_type in (
    'staff_invited', 'invitation_resent', 'invitation_cancelled',
    'role_changed', 'account_suspended', 'account_reactivated',
    'staff_deactivated', 'staff_reactivated', 'ccro_admin_replaced',
    'ccro_admin_appointed',
    'security_finding_acknowledged', 'security_finding_assigned',
    'security_finding_resolved', 'security_control_reviewed',
    'account_details_updated', 'password_reset_sent',
    'sessions_revoked', 'verification_resent'
  ));

-- Index backing the per-account history lookup (events targeting one account).
create index if not exists system_audit_events_target_idx
  on public.system_audit_events(target_profile_id, created_at desc);

-- Deleting auth.sessions cascades to the session's refresh tokens, so the
-- account can neither refresh nor keep a long-lived session. An access token
-- already issued stays valid until its (short) expiry; the suspend flow also
-- bans the user, which blocks everything after that.
create or replace function public.revoke_user_sessions(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  revoked integer;
begin
  delete from auth.sessions where user_id = target_user_id;
  get diagnostics revoked = row_count;
  return revoked;
end;
$$;

-- Called only from server functions with the service-role key, after the
-- caller's system-administrator permission has been checked there.
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
