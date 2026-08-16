-- Adds a network-masked IP and device (user agent) signal to staff/administrator
-- session telemetry and the privileged-action audit trail. Only a network-masked
-- address is ever stored (host-level detail zeroed) — never a full, re-identifiable
-- IP address — matching the redaction approach already used for failed-login
-- identifiers (see fingerprint_identifier-style hashing in security-center.server.ts).

alter table public.system_security_events
  drop constraint if exists system_security_events_event_type_check;
alter table public.system_security_events
  add constraint system_security_events_event_type_check check (event_type in (
    'sign_in_failed', 'admin_session_started', 'staff_session_started'
  ));

alter table public.system_security_events
  add column if not exists masked_ip_address text
    check (masked_ip_address is null or length(masked_ip_address) <= 45),
  add column if not exists user_agent text
    check (user_agent is null or length(user_agent) <= 300);

comment on table public.system_security_events is
  'Redacted authentication and staff/administrator-session signals. Only network-masked IP addresses (host-level detail zeroed) and browser/device user-agent strings may be stored, and only for staff and administrator session events. Citizen submissions, document metadata, raw email addresses, passwords, tokens, request payloads, and full/unmasked IP addresses are prohibited here.';

alter table public.system_audit_events
  add column if not exists masked_ip_address text
    check (masked_ip_address is null or length(masked_ip_address) <= 45),
  add column if not exists user_agent text
    check (user_agent is null or length(user_agent) <= 300);
