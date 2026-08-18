-- The staff-read storage policy still listed roles that no longer exist
-- (frontdesk/archive/legal, removed by 20260818120000) and never included
-- `supervisor`, which is department-scoped like staff and shares the same
-- requests:process permission. Realign the role list with `src/lib/permissions.ts`.

drop policy if exists "Staff can read all uploaded documents" on storage.objects;
create policy "Staff can read all uploaded documents"
  on storage.objects
  for select
  using (
    bucket_id = 'request-documents'
    and public.get_user_role() = any (array['admin', 'staff', 'supervisor', 'cashier'])
  );
