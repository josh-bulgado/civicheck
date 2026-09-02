-- Private, pre-submission upload sessions. Files remain in Storage while the
-- applicant moves through the wizard; these rows provide the ownership and
-- lifecycle record needed to validate submission and clean abandoned objects.
create table public.request_upload_drafts (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  scope_key text not null check (length(btrim(scope_key)) between 1 and 160),
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_request_id uuid references public.requests(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_upload_draft_files (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.request_upload_drafts(id) on delete cascade,
  requirement_id uuid references public.service_requirements_metadata(id) on delete set null,
  subject_role text check (subject_role is null or length(subject_role) <= 160),
  storage_path text not null unique check (length(storage_path) between 1 and 1200),
  file_name text not null check (length(file_name) between 1 and 500),
  file_size bigint not null check (file_size between 0 and 10485760),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'application/pdf')),
  created_at timestamptz not null default now()
);

create index request_upload_drafts_cleanup_idx
  on public.request_upload_drafts (status, updated_at);
create index request_upload_drafts_applicant_idx
  on public.request_upload_drafts (applicant_id, updated_at desc);
create unique index request_upload_drafts_open_scope_idx
  on public.request_upload_drafts (applicant_id, scope_key)
  where status = 'draft';
create index request_upload_draft_files_draft_idx
  on public.request_upload_draft_files (draft_id, created_at);

alter table public.request_upload_drafts enable row level security;
alter table public.request_upload_draft_files enable row level security;

grant select on public.request_upload_drafts to authenticated;
grant select on public.request_upload_draft_files to authenticated;
grant all on public.request_upload_drafts to service_role;
grant all on public.request_upload_draft_files to service_role;
revoke all on public.request_upload_drafts from anon;
revoke all on public.request_upload_draft_files from anon;
revoke insert, update, delete, truncate
  on public.request_upload_drafts from authenticated;
revoke insert, update, delete, truncate
  on public.request_upload_draft_files from authenticated;

create policy "Applicants can read own upload drafts"
  on public.request_upload_drafts for select to authenticated
  using (applicant_id = (select auth.uid()));

create policy "Applicants can read files from own upload drafts"
  on public.request_upload_draft_files for select to authenticated
  using (
    exists (
      select 1
      from public.request_upload_drafts draft
      where draft.id = request_upload_draft_files.draft_id
        and draft.applicant_id = (select auth.uid())
    )
  );

comment on table public.request_upload_drafts is
  'Authenticated staging sessions for application files uploaded before the request is submitted.';
comment on table public.request_upload_draft_files is
  'Server-recorded manifest used to prove staged-file ownership and remove abandoned Storage objects.';

-- Applicants can upload and view their own objects, but deletion is kept
-- behind authenticated server functions so submitted evidence cannot be
-- removed by calling the Storage API directly.
drop policy if exists "Applicants upload to their own document folder"
  on storage.objects;
drop policy if exists "Applicants manage their own uploaded documents"
  on storage.objects;

create policy "Applicants upload to their own document folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'request-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Applicants read their own document folder"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'request-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
