-- Record accepted physical papers before a walk-in birth starts processing.
alter table public.requests
  add column if not exists walk_in_accepted_by uuid references public.profiles(id),
  add column if not exists walk_in_accepted_at timestamptz;
create index if not exists requests_walk_in_accepted_by_idx
  on public.requests(walk_in_accepted_by) where walk_in_accepted_by is not null;

create or replace function public.protect_birth_walkin_acceptance()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='UPDATE' then
    if new.walk_in_accepted_by is distinct from old.walk_in_accepted_by
      or new.walk_in_accepted_at is distinct from old.walk_in_accepted_at then
      raise exception 'The original walk-in acceptance record cannot be changed';
    end if;
    return new;
  end if;
  if new.walk_in_accepted_by is null and new.walk_in_accepted_at is null then return new; end if;
  if auth.uid() is null or new.walk_in_accepted_by is distinct from auth.uid()
    or public.get_user_role() is null or public.get_user_role() not in ('staff','supervisor','admin')
    or new.applicant_id is not null or new.form_data->>'intake_channel' is distinct from 'walk_in'
    or not (new.request_type like 'OTCOLB-%' or new.request_type like 'DCOLB-%' or new.request_type in ('BIRTH_ONTIME','BIRTH_DELAYED'))
    or new.status is distinct from 'processing' or new.payment_status is distinct from 'unpaid'
    or new.or_number is not null then
    raise exception 'Only staff can accept checked walk-in birth documents for processing';
  end if;
  if public.get_user_role() <> 'admin' and not exists (
    select 1 from public.services_registry s where s.service_code=new.request_type
      and s.department_id=public.get_user_department_id()
  ) then raise exception 'Pick a birth service assigned to your department'; end if;
  new.walk_in_accepted_at := clock_timestamp();
  return new;
end $$;
revoke all on function public.protect_birth_walkin_acceptance() from public,anon,authenticated;
drop trigger if exists accept_birth_walkin on public.requests;
create trigger accept_birth_walkin before insert or update on public.requests
for each row execute function public.protect_birth_walkin_acceptance();

-- Retain every existing workflow guard, with one checked-intake exception.
do $$
declare original text; updated text;
begin
  select pg_get_functiondef('public.guard_request_workflow()'::regprocedure) into original;
  if position('new.walk_in_accepted_by = auth.uid()' in original)>0 then return; end if;
  updated := replace(original,
    'if new.status is distinct from ''submitted''',
    'if (new.status is distinct from ''submitted'' and not (
      new.status = ''processing'' and new.walk_in_accepted_by = auth.uid()
      and new.walk_in_accepted_at is not null and new.applicant_id is null
      and new.form_data->>''intake_channel'' = ''walk_in''
      and (new.request_type like ''OTCOLB-%'' or new.request_type like ''DCOLB-%'' or new.request_type in (''BIRTH_ONTIME'',''BIRTH_DELAYED''))
      and public.get_user_role() in (''staff'',''supervisor'',''admin'')
    ))');
  if updated=original then raise exception 'Expected request-insert guard was not found'; end if;
  execute updated;
end $$;

create or replace function public.log_birth_walkin_acceptance()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.walk_in_accepted_by is null then return new; end if;
  insert into public.application_logs(request_id,performed_by_profile_id,action_status,remarks)
  values(new.id,new.walk_in_accepted_by,'walk_in_accepted',
    'Checked the physical documents. The required papers are complete and acceptable.'),
    (new.id,new.walk_in_accepted_by,'processing',
    'Accepted walk-in birth request. Initial physical screening was completed at intake.');
  return new;
end $$;
revoke all on function public.log_birth_walkin_acceptance() from public,anon,authenticated;
drop trigger if exists log_birth_walkin_acceptance on public.requests;
create trigger log_birth_walkin_acceptance after insert on public.requests
for each row execute function public.log_birth_walkin_acceptance();
