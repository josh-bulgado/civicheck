create table if not exists public.departments (
  id text primary key,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.departments (id, name)
values
  ('birth', 'Birth'),
  ('death', 'Death'),
  ('marriage', 'Marriage'),
  ('legal', 'Legal'),
  ('archives', 'Archives')
on conflict (id) do update set name = excluded.name;

alter table public.profiles
  add column if not exists employment_type text;

alter table public.profiles
  drop constraint if exists profiles_employment_type_check;

alter table public.profiles
  add constraint profiles_employment_type_check
  check (employment_type is null or employment_type in ('regular', 'job_order', 'contractual'));

alter table public.departments enable row level security;

drop policy if exists "Authenticated users can view active departments" on public.departments;
create policy "Authenticated users can view active departments"
  on public.departments for select
  to authenticated
  using (is_active = true);

drop policy if exists "Admins can manage departments" on public.departments;
create policy "Admins can manage departments"
  on public.departments for all
  to authenticated
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');
