-- Request operations: department queues, immutable requirement snapshots,
-- audited workflow actions, walk-in contacts, notifications, and RLS.

alter table public.services_registry add column if not exists department_id text;
alter table public.services_registry drop constraint if exists services_registry_department_id_fkey;
alter table public.services_registry add constraint services_registry_department_id_fkey
  foreign key (department_id) references public.departments(id);

update public.services_registry set department_id = case
  when service_code in ('BIRTH_ONTIME','BIRTH_DELAYED','LEGITIMATION') then 'birth'
  when service_code in ('DEATH_ONTIME','DEATH_DELAYED') then 'death'
  when service_code in ('MARRIAGE_LICENSE','MARRIAGE_ONTIME','MARRIAGE_DELAYED') then 'marriage'
  when service_code in ('RA9048_10172','RA9255_SURNAME','COURT_DECREE','SUPPLEMENTAL_REPORT') then 'legal'
  when service_code in ('CTC_ISSUANCE','ELEC_ENDORSEMENT','OTHER_CERT','EMAIL_INQUIRY') then 'archives'
  else department_id end
where department_id is null;

alter table public.requests add column if not exists department_id text references public.departments(id);
alter table public.requests add column if not exists submission_source text not null default 'online';
alter table public.requests add column if not exists archived_at timestamptz;
alter table public.requests add column if not exists archived_by uuid references auth.users(id);
alter table public.requests add column if not exists payment_reference text;
alter table public.requests add column if not exists payment_verified_at timestamptz;
alter table public.requests add column if not exists payment_verified_by uuid references auth.users(id);
alter table public.requests add column if not exists workflow_version integer not null default 1;
alter table public.requests add column if not exists status_reason text;
alter table public.requests add column if not exists updated_at timestamptz not null default now();
alter table public.requests drop constraint if exists requests_submission_source_check;
alter table public.requests add constraint requests_submission_source_check check (submission_source in ('online','walk_in'));

update public.requests r set department_id = s.department_id
from public.services_registry s
where s.service_code = r.request_type and r.department_id is null;

create unique index if not exists requests_payment_reference_unique
  on public.requests (lower(payment_reference)) where payment_reference is not null;
create index if not exists requests_queue_idx on public.requests (archived_at, status, created_at);
create index if not exists requests_department_idx on public.requests (department_id, status);

create table if not exists public.request_contacts (
  request_id uuid primary key references public.requests(id) on delete cascade,
  requester_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.request_requirements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  source_requirement_id uuid,
  requirement_name text not null,
  is_mandatory boolean not null,
  review_status text not null default 'pending'
    check (review_status in ('pending','accepted','missing','not_applicable')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  position integer not null default 0,
  unique (request_id, source_requirement_id)
);

create table if not exists public.request_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  from_status text,
  to_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists request_activity_request_idx on public.request_activity(request_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  recipient_id uuid references auth.users(id),
  recipient_email text,
  title text not null,
  message text not null,
  read_at timestamptz,
  email_status text not null default 'pending'
    check (email_status in ('not_applicable','pending','sent','failed')),
  email_attempts integer not null default 0,
  email_last_error text,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications(recipient_id, read_at, created_at desc);

create or replace function public.snapshot_request_requirements()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.request_requirements
    (request_id, source_requirement_id, requirement_name, is_mandatory, position)
  select new.id, m.id, m.requirement_name, m.is_mandatory,
         row_number() over (order by m.is_mandatory desc, m.requirement_name)::integer
  from public.service_requirements_metadata m
  where m.service_code = new.request_type
  on conflict (request_id, source_requirement_id) do nothing;
  return new;
end $$;

drop trigger if exists snapshot_request_requirements_after_insert on public.requests;
create trigger snapshot_request_requirements_after_insert after insert on public.requests
for each row execute function public.snapshot_request_requirements();

insert into public.request_requirements
  (request_id, source_requirement_id, requirement_name, is_mandatory, position)
select r.id, m.id, m.requirement_name, m.is_mandatory,
       row_number() over (partition by r.id order by m.is_mandatory desc, m.requirement_name)::integer
from public.requests r join public.service_requirements_metadata m on m.service_code = r.request_type
where not exists (select 1 from public.request_requirements rr where rr.request_id = r.id)
on conflict (request_id, source_requirement_id) do nothing;

create or replace function public.current_staff_profile()
returns table(role text, department_id text) language sql stable security definer set search_path = public as $$
  select p.role::text, p.department_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.can_view_request(r public.requests)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then false
    when r.applicant_id = auth.uid() then true
    when exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','supervisor')) then true
    when exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='frontdesk' and r.status::text='pending_frontdesk') then true
    when exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='cashier' and r.status::text='ready_for_release') then true
    when exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='staff' and p.department_id=r.department_id) then true
    else false end
$$;

create or replace function public.enqueue_request_notification(p_request public.requests, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text; v_name text; v_service text; v_message text;
begin
  if p_request.status::text not in ('incomplete','rejected','ready_for_release','released') then return; end if;
  select name into v_service from public.services_registry where service_code=p_request.request_type;
  select email into v_email from auth.users where id=p_request.applicant_id;
  if v_email is null then select email into v_email from public.request_contacts where request_id=p_request.id; end if;
  v_message := concat('Request ',p_request.tracking_number,' for ',coalesce(v_service,p_request.request_type),' is now ',replace(p_request.status::text,'_',' '),case when p_reason is not null then '. Reason: '||p_reason else '' end,'.');
  insert into public.notifications(request_id,recipient_id,recipient_email,title,message,email_status)
  values(p_request.id,p_request.applicant_id,v_email,'Request update: '||replace(p_request.status::text,'_',' '),v_message,case when v_email is null then 'not_applicable' else 'pending' end);
end $$;

create or replace function public.transition_request(
  p_request_id uuid, p_expected_version integer, p_new_status text,
  p_reason text default null, p_reviews jsonb default null)
returns public.requests language plpgsql security definer set search_path = public as $$
declare r public.requests; v_role text; v_dept text; v_allowed boolean := false; v_missing integer; v_old_status text;
begin
  select * into r from public.requests where id=p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  select p.role::text,p.department_id into v_role,v_dept from public.profiles p where p.id=auth.uid();
  if v_role is null then raise exception 'Unauthorized'; end if;
  if r.archived_at is not null then raise exception 'Archived requests cannot be changed'; end if;
  if r.workflow_version <> p_expected_version then raise exception 'STALE_REQUEST: Reload and try again'; end if;
  v_old_status := r.status::text;
  if v_role='admin' or v_role='supervisor' then v_allowed := true;
  elsif v_role='staff' and v_dept=r.department_id then v_allowed := true;
  elsif v_role='frontdesk' and r.status::text='pending_frontdesk' and p_new_status='under_validation' then v_allowed := true;
  else v_allowed := false; end if;
  if not v_allowed then raise exception 'Forbidden'; end if;
  if p_new_status='ready_for_release' and v_role not in ('admin','supervisor') then raise exception 'Approval permission required'; end if;
  if not ((r.status::text='pending_frontdesk' and p_new_status='under_validation') or
    (r.status::text='under_validation' and p_new_status in ('incomplete','rejected','processing')) or
    (r.status::text='incomplete' and p_new_status in ('under_validation','rejected')) or
    (r.status::text='processing' and p_new_status in ('pending_approval','under_validation')) or
    (r.status::text='pending_approval' and p_new_status in ('ready_for_release','processing')) or
    (r.status::text='ready_for_release' and p_new_status in ('released','processing'))) then
    raise exception 'Invalid workflow transition';
  end if;
  if p_new_status in ('incomplete','rejected') or
     (r.status::text in ('processing','pending_approval','ready_for_release') and p_new_status in ('under_validation','processing')) then
    if nullif(btrim(p_reason),'') is null then raise exception 'A reason is required'; end if;
  end if;
  if p_reviews is not null and r.status::text in ('under_validation','incomplete') then
    update public.request_requirements rr set
      review_status=x.status, review_note=x.note, reviewed_by=auth.uid(), reviewed_at=now()
    from jsonb_to_recordset(p_reviews) as x(id uuid,status text,note text)
    where rr.id=x.id and rr.request_id=p_request_id
      and x.status in ('pending','accepted','missing','not_applicable');
    insert into public.request_activity(request_id,actor_id,event_type,metadata)
      values(p_request_id,auth.uid(),'checklist_reviewed',jsonb_build_object('items',jsonb_array_length(p_reviews)));
  end if;
  if p_new_status='processing' then
    select count(*) into v_missing from public.request_requirements
    where request_id=p_request_id and ((is_mandatory and review_status<>'accepted') or
      (not is_mandatory and review_status not in ('accepted','not_applicable')));
    if v_missing>0 then raise exception 'Requirements must be resolved before processing'; end if;
  end if;
  if p_new_status='released' and (r.payment_status::text<>'verified' and coalesce(r.fees_due,0)>0) then
    raise exception 'Payment must be verified before release';
  end if;
  update public.requests set status=p_new_status, status_reason=p_reason,
    workflow_version=workflow_version+1, updated_at=now() where id=p_request_id returning * into r;
  insert into public.request_activity(request_id,actor_id,event_type,from_status,to_status,reason)
    values(p_request_id,auth.uid(),'status_changed',v_old_status,p_new_status,p_reason);
  perform public.enqueue_request_notification(r,p_reason);
  return r;
end $$;

create or replace function public.verify_request_payment(p_request_id uuid,p_expected_version integer,p_reference text)
returns public.requests language plpgsql security definer set search_path=public as $$
declare r public.requests; v_role text;
begin
  select * into r from public.requests where id=p_request_id for update;
  select role::text into v_role from public.profiles where id=auth.uid();
  if v_role not in ('cashier','admin') then raise exception 'Forbidden'; end if;
  if r.status::text<>'ready_for_release' then raise exception 'Request is not ready for release'; end if;
  if r.workflow_version<>p_expected_version then raise exception 'STALE_REQUEST: Reload and try again'; end if;
  if nullif(btrim(p_reference),'') is null then raise exception 'Official receipt/reference is required'; end if;
  update public.requests set payment_status='verified',payment_reference=btrim(p_reference),
    payment_verified_at=now(),payment_verified_by=auth.uid(),workflow_version=workflow_version+1,updated_at=now()
    where id=p_request_id returning * into r;
  insert into public.request_activity(request_id,actor_id,event_type,metadata)
    values(p_request_id,auth.uid(),'payment_verified',jsonb_build_object('reference',p_reference));
  return r;
end $$;

create or replace function public.archive_request(p_request_id uuid,p_expected_version integer,p_restore boolean default false)
returns public.requests language plpgsql security definer set search_path=public as $$
declare r public.requests; v_role text;
begin
  select * into r from public.requests where id=p_request_id for update;
  select role::text into v_role from public.profiles where id=auth.uid();
  if v_role<>'admin' then raise exception 'Forbidden'; end if;
  if r.workflow_version<>p_expected_version then raise exception 'STALE_REQUEST: Reload and try again'; end if;
  if p_restore then
    if r.archived_at is null then raise exception 'Request is not archived'; end if;
    update public.requests set archived_at=null,archived_by=null,workflow_version=workflow_version+1,updated_at=now() where id=p_request_id returning * into r;
    insert into public.request_activity(request_id,actor_id,event_type) values(p_request_id,auth.uid(),'restored');
  else
    if r.status::text not in ('released','rejected') then raise exception 'Only terminal requests can be archived'; end if;
    update public.requests set archived_at=now(),archived_by=auth.uid(),workflow_version=workflow_version+1,updated_at=now() where id=p_request_id returning * into r;
    insert into public.request_activity(request_id,actor_id,event_type) values(p_request_id,auth.uid(),'archived');
  end if;
  return r;
end $$;

create or replace function public.create_operational_request(
  p_service_code text,p_form_data jsonb,p_source text default 'online',
  p_guest_name text default null,p_guest_email text default null,p_applicant_id uuid default null)
returns public.requests language plpgsql security definer set search_path=public as $$
declare s public.services_registry; r public.requests; v_role text; v_id uuid; v_tracking text;
begin
  select * into s from public.services_registry where service_code=p_service_code;
  if not found or s.department_id is null then raise exception 'Service has no assigned department'; end if;
  if p_source not in ('online','walk_in') then raise exception 'Invalid submission source'; end if;
  if p_source='online' then v_id:=auth.uid(); if v_id is null then raise exception 'Unauthorized'; end if;
  else
    select role::text into v_role from public.profiles where id=auth.uid();
    if v_role not in ('frontdesk','staff','supervisor','admin') then raise exception 'Forbidden'; end if;
    v_id:=p_applicant_id;
    if v_id is null and nullif(btrim(p_guest_name),'') is null then raise exception 'Requester name is required'; end if;
  end if;
  loop
    v_tracking:=format('CCRO-%s-%s',extract(year from now())::int,lpad((floor(random()*1000000))::int::text,6,'0'));
    exit when not exists(select 1 from public.requests where tracking_number=v_tracking);
  end loop;
  insert into public.requests(applicant_id,request_type,form_data,tracking_number,fees_due,department_id,submission_source,status,payment_status)
  values(v_id,p_service_code,coalesce(p_form_data,'{}'),v_tracking,s.fee,s.department_id,p_source,'pending_frontdesk',case when coalesce(s.fee,0)>0 then 'unpaid' else 'verified' end)
  returning * into r;
  if p_source='walk_in' and v_id is null then insert into public.request_contacts(request_id,requester_name,email) values(r.id,btrim(p_guest_name),nullif(lower(btrim(p_guest_email)),'')); end if;
  insert into public.request_activity(request_id,actor_id,event_type,metadata) values(r.id,auth.uid(),'created',jsonb_build_object('source',p_source));
  return r;
end $$;

alter table public.request_contacts enable row level security;
alter table public.request_requirements enable row level security;
alter table public.request_activity enable row level security;
alter table public.notifications enable row level security;
alter table public.requests enable row level security;

do $$ declare policy_name text; begin
  for policy_name in select policyname from pg_policies where schemaname='public' and tablename='requests'
  loop execute format('drop policy if exists %I on public.requests',policy_name); end loop;
end $$;
drop policy if exists "Authorized request visibility" on public.requests;
create policy "Authorized request visibility" on public.requests for select to authenticated using (public.can_view_request(requests));
drop policy if exists "Authorized contact visibility" on public.request_contacts;
create policy "Authorized contact visibility" on public.request_contacts for select to authenticated using (exists(select 1 from public.requests r where r.id=request_id and public.can_view_request(r)));
drop policy if exists "Authorized requirement visibility" on public.request_requirements;
create policy "Authorized requirement visibility" on public.request_requirements for select to authenticated using (exists(select 1 from public.requests r where r.id=request_id and public.can_view_request(r)));
drop policy if exists "Authorized activity visibility" on public.request_activity;
create policy "Authorized activity visibility" on public.request_activity for select to authenticated using (exists(select 1 from public.requests r where r.id=request_id and public.can_view_request(r)));
drop policy if exists "Applicants view notifications" on public.notifications;
create policy "Applicants view notifications" on public.notifications for select to authenticated using (recipient_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','supervisor')));
drop policy if exists "Applicants mark notifications read" on public.notifications;
create policy "Applicants mark notifications read" on public.notifications for update to authenticated using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());

revoke insert, update, delete on public.requests from authenticated;
revoke insert, update, delete on public.request_contacts from authenticated;
revoke insert, update, delete on public.request_requirements from authenticated;
revoke insert, update, delete on public.request_activity from authenticated;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.requests, public.request_contacts, public.request_requirements, public.request_activity, public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

revoke all on function public.transition_request(uuid,integer,text,text,jsonb) from public;
revoke all on function public.verify_request_payment(uuid,integer,text) from public;
revoke all on function public.archive_request(uuid,integer,boolean) from public;
revoke all on function public.create_operational_request(text,jsonb,text,text,text,uuid) from public;
grant execute on function public.transition_request(uuid,integer,text,text,jsonb) to authenticated;
grant execute on function public.verify_request_payment(uuid,integer,text) to authenticated;
grant execute on function public.archive_request(uuid,integer,boolean) to authenticated;
grant execute on function public.create_operational_request(text,jsonb,text,text,text,uuid) to authenticated;
