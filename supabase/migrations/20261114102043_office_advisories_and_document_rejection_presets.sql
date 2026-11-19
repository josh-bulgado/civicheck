-- Office-wide public notices and editable document-review guidance.
-- No closure notice is seeded. Display dates are inclusive Philippine dates.
create table public.office_advisories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  importance text not null default 'routine' check (importance in ('important','routine')),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  publication_status text not null default 'draft' check (publication_status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  check (starts_on between date '1900-01-01' and date '9999-12-31'),
  check (ends_on between date '1900-01-01' and date '9999-12-31')
);
create index office_advisories_display_idx on public.office_advisories(starts_on, ends_on) where publication_status = 'published';
create index office_advisories_creator_idx on public.office_advisories(created_by) where created_by is not null;
create index office_advisories_editor_idx on public.office_advisories(updated_by) where updated_by is not null;

create table public.document_rejection_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  explanation text not null check (char_length(btrim(explanation)) between 1 and 500),
  instruction text not null check (char_length(btrim(instruction)) between 1 and 700),
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);
create index document_rejection_presets_creator_idx on public.document_rejection_presets(created_by) where created_by is not null;
create index document_rejection_presets_editor_idx on public.document_rejection_presets(updated_by) where updated_by is not null;

alter table public.office_advisories enable row level security;
alter table public.document_rejection_presets enable row level security;
revoke all on public.office_advisories, public.document_rejection_presets from public, anon, authenticated;
grant select(id,title,message,importance,starts_on,ends_on,publication_status,created_at,updated_at)
  on public.office_advisories to anon, authenticated;
grant insert(title,message,importance,starts_on,ends_on,publication_status),
  update(title,message,importance,starts_on,ends_on,publication_status)
  on public.office_advisories to authenticated;
grant select(id,label,explanation,instruction,active,sort_order,created_at,updated_at),
  insert(label,explanation,instruction,active,sort_order),
  update(label,explanation,instruction,active,sort_order)
  on public.document_rejection_presets to authenticated;
grant all on public.office_advisories, public.document_rejection_presets to service_role;

create policy "Public readers see currently published notices" on public.office_advisories
for select to anon, authenticated using (
  publication_status = 'published'
  and starts_on <= (current_timestamp at time zone 'Asia/Manila')::date
  and ends_on >= (current_timestamp at time zone 'Asia/Manila')::date
);
create policy "Active CCRO admins read all notices" on public.office_advisories
for select to authenticated using ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');
create policy "Active CCRO admins create notices" on public.office_advisories
for insert to authenticated with check ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');
create policy "Active CCRO admins edit notices" on public.office_advisories
for update to authenticated
using ((select public.is_active_user()) and (select public.get_user_role()) = 'admin')
with check ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');

create policy "Processing personnel read active reasons and admins read all" on public.document_rejection_presets
for select to authenticated using (
  (select public.is_active_user()) and (
    (select public.get_user_role()) = 'admin'
    or ((select public.get_user_role()) in ('staff','supervisor') and active)
  )
);
create policy "Active CCRO admins create reasons" on public.document_rejection_presets
for insert to authenticated with check ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');
create policy "Active CCRO admins edit reasons" on public.document_rejection_presets
for update to authenticated
using ((select public.is_active_user()) and (select public.get_user_role()) = 'admin')
with check ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');

-- Actors/timestamps are never accepted from the Data API, including for admins.
create function public.stamp_office_configuration() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := clock_timestamp();
  end if;
  new.updated_by := auth.uid();
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.stamp_office_configuration() from public, anon, authenticated;
create trigger stamp_office_advisories before insert or update of title,message,importance,starts_on,ends_on,publication_status on public.office_advisories
for each row execute function public.stamp_office_configuration();
create trigger stamp_document_rejection_presets before insert or update of label,explanation,instruction,active,sort_order on public.document_rejection_presets
for each row execute function public.stamp_office_configuration();

insert into public.document_rejection_presets(label,explanation,instruction,sort_order) values
  ('Blurry or unreadable', 'The file is blurry or unreadable.', 'Upload a clear, well-lit photo or scan with all text readable.', 10),
  ('Cut off or missing pages', 'The document is cut off or missing pages.', 'Upload the complete document with every page and all edges visible.', 20),
  ('Wrong document', 'This is not the document required for this requirement.', 'Check the requirement name and replace this upload with the requested document.', 30),
  ('Expired document', 'The document is expired or no longer valid.', 'Replace this upload with a current, valid document for this requirement.', 40),
  ('Details do not match', 'The details on the document do not match the request.', 'Review your submitted details and contact the CCRO to confirm what needs correcting before uploading a replacement.', 50);
