-- Profile photos. The bucket is private: a resident's photo is personal data, so
-- it is only ever reached through short-lived signed URLs minted for the signed-in
-- owner. `profiles.avatar_path` holds the object path inside the bucket.

alter table public.profiles
  add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects live under `<user id>/...`, so access is scoped by the first path
-- segment: people can upload, read, replace and delete only their own folder.
drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read their own avatar" on storage.objects;
create policy "Users read their own avatar"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users replace their own avatar" on storage.objects;
create policy "Users replace their own avatar"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Audit vocabulary ────────────────────────────────────────────────────────
-- A password change is a security-relevant account action, so it is recorded
-- with the other account events.
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
    'sessions_revoked', 'verification_resent',
    'service_created', 'service_updated', 'service_deleted',
    'service_form_published',
    'password_changed'
  ));
