-- Keep rejected death-registration uploads on the same attachment so existing
-- ownership policies and workflow counts still apply to the current file only.
alter table public.requirements_attachments
  add column previous_uploads jsonb not null default '[]'::jsonb
  check (jsonb_typeof(previous_uploads) = 'array');

create function public.preserve_death_previous_upload()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- History is maintained here, never supplied by a client.
  new.previous_uploads := old.previous_uploads;
  if new.file_url is distinct from old.file_url
    and old.verification_status = 'rejected'
    and exists (
      select 1 from public.requests
      where id = old.request_id
        and request_type in ('DEATH_ONTIME', 'DEATH_DELAYED')
    ) then
    new.previous_uploads := old.previous_uploads || jsonb_build_array(
      jsonb_build_object(
        'fileUrl', old.file_url,
        'rejectionReason', old.rejection_reason,
        'uploadedAt', old.uploaded_at,
        'replacedAt', now()
      )
    );
    new.uploaded_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.preserve_death_previous_upload() from public, anon, authenticated;
create trigger preserve_death_previous_upload
before update on public.requirements_attachments
for each row execute function public.preserve_death_previous_upload();

-- Attachment RLS still limits staff to requests in their department.
alter policy "Personnel read documents on permitted requests"
on storage.objects
using (
  bucket_id = 'request-documents'
  and (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor'])
  and exists (
    select 1 from public.requirements_attachments a
    where a.file_url = storage.objects.name
      or a.previous_uploads @> jsonb_build_array(jsonb_build_object('fileUrl', storage.objects.name))
  )
);
