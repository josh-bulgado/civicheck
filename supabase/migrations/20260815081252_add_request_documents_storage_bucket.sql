-- Storage for pre-validation document uploads used by the public apply
-- wizard's upload step. Document metadata itself goes in the existing
-- `public.requirements_attachments` table (request_id, requirement_name,
-- file_url, verification_status) — that table already has RLS policies
-- for this exact applicant-uploads/staff-reviews flow, so this migration
-- only adds the storage bucket those uploads land in.

insert into storage.buckets (id, name, public)
values ('request-documents', 'request-documents', false)
on conflict (id) do nothing;

-- Files are stored under `<applicant_id>/...` before the parent `requests`
-- row exists (the wizard uploads to storage ahead of final submission), so
-- storage access is scoped by path prefix rather than by request_id.
drop policy if exists "Applicants upload to their own document folder" on storage.objects;
create policy "Applicants upload to their own document folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'request-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Applicants manage their own uploaded documents" on storage.objects;
create policy "Applicants manage their own uploaded documents"
  on storage.objects
  for all
  using (
    bucket_id = 'request-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'request-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Staff can read all uploaded documents" on storage.objects;
create policy "Staff can read all uploaded documents"
  on storage.objects
  for select
  using (
    bucket_id = 'request-documents'
    and public.get_user_role() = any (array['admin', 'frontdesk', 'staff', 'archive', 'legal', 'cashier'])
  );
