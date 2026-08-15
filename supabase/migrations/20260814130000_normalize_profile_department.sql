alter table public.profiles
  add column if not exists department_id text;

update public.profiles
set department_id = department
where department is not null
  and department_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_department_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_department_id_fkey
      foreign key (department_id) references public.departments (id);
  end if;
end $$;

create index if not exists profiles_department_id_idx
  on public.profiles (department_id);

alter table public.profiles
  drop column if exists department;
