-- "Sign out all sessions" must take effect immediately.
--
-- Deleting auth.sessions removes the refresh tokens, but the app verifies the
-- access token locally (getClaims) and never consults that table, so a token
-- already in the browser keeps working until it expires — up to an hour. The
-- server now rejects any token issued before profiles.sessions_revoked_at, which
-- it already has in hand because it reads the profile on every request.

alter table public.profiles
  add column if not exists sessions_revoked_at timestamptz;

comment on column public.profiles.sessions_revoked_at is
  'Access tokens issued before this moment are rejected. Set by revoke_user_sessions() only.';

-- Same guard as before, plus the new column: a user must never be able to clear
-- their own revocation marker through the profile self-service policies.
create or replace function public.guard_profile_access_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.role::text = 'system_admin' then
      raise exception 'System Administrator promotion is manual only';
    end if;
    if tg_op = 'UPDATE' and (
      new.role is distinct from old.role
      or new.access_status is distinct from old.access_status
      or new.suspended_at is distinct from old.suspended_at
      or new.suspended_by is distinct from old.suspended_by
      or new.suspension_reason is distinct from old.suspension_reason
      or new.sessions_revoked_at is distinct from old.sessions_revoked_at
    ) then
      raise exception 'Protected profile access fields cannot be changed directly';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.revoke_user_sessions(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  revoked integer;
begin
  -- Marker first: even if the delete below were to fail, tokens already issued
  -- are rejected by the server.
  update public.profiles
    set sessions_revoked_at = now()
    where id = target_user_id;

  delete from auth.sessions where user_id = target_user_id;
  get diagnostics revoked = row_count;
  return revoked;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
