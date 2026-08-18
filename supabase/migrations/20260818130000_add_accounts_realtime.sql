-- Live account oversight for the System Administrator.
--
-- The accounts directory reads through the service-role client (which bypasses
-- RLS), so nothing here widens what a System Administrator can already see.
-- Realtime is different: postgres_changes evaluates each row against the
-- *subscriber's* JWT, and the existing "Staff and admin can view all profiles"
-- policy never listed system_admin. Without this policy a System Administrator
-- would only ever receive change events for their own profile row.

drop policy if exists "System admin can view all profiles" on public.profiles;

create policy "System admin can view all profiles"
  on public.profiles
  for select
  using (public.get_user_role() = 'system_admin');

-- Publish profiles so account edits, suspensions and role changes stream to
-- subscribed clients. Default replica identity (primary key) is enough: the
-- dashboard only needs "something changed" and then refetches through the
-- server function, so old_record is never inspected.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end
$$;
