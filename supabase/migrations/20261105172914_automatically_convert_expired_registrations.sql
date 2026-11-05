alter table public.requests add column registration_conversion jsonb;

create function public.guard_registration_conversion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon','authenticated') then
    if (tg_op='INSERT' and new.registration_conversion is not null)
      or (tg_op='UPDATE' and new.registration_conversion is distinct from old.registration_conversion) then
      raise exception 'Registration conversion is managed automatically';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_registration_conversion before insert or update on public.requests
for each row execute function public.guard_registration_conversion();
revoke all on function public.guard_registration_conversion() from public,anon,authenticated;

create table public.registration_delay_notices (
  request_id uuid primary key references public.requests(id) on delete cascade,
  notification_id uuid not null unique references public.notifications(id) on delete cascade,
  claimed_at timestamptz,
  attempts integer not null default 0
);
alter table public.registration_delay_notices enable row level security;
revoke all on public.registration_delay_notices from anon,authenticated;
grant all on public.registration_delay_notices to service_role;

create function public.delayed_registration_service(p_code text,p_answers jsonb,p_today date) returns text
language sql immutable set search_path = '' as $$
  select case upper(p_code)
    when 'DEATH_ONTIME' then 'DEATH_DELAYED'
    when 'MARRIAGE_ONTIME' then 'MARRIAGE_DELAYED'
    else case when upper(p_code) in ('OTCOLB-MARITAL','OTCOLB-NONMARITAL','BIRTH_ONTIME') then
      case when upper(p_code)='BIRTH_ONTIME' and coalesce(p_answers->>'marital','') not in ('marital','non-marital') then null
      else 'DCOLB-' || case when extract(year from age(p_today,public.civicheck_safe_date(p_answers->>'event_date')))>=80 then '80UP' else '0079' end
        || '-NORMAL-' || case when upper(p_code)='OTCOLB-NONMARITAL' or (upper(p_code)='BIRTH_ONTIME' and p_answers->>'marital'='non-marital') then 'NONMARITAL' else 'MARITAL' end end
    end end;
$$;

create function public.convert_expired_registrations(p_request_id uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  r record; target record; v_code text; v_answers jsonb; v_note text; v_email text;
  v_notification uuid; v_count integer:=0; v_today date:=(now() at time zone 'Asia/Manila')::date;
begin
  for r in
    select q.*,public.registration_deadline(q.request_type,q.form_data) as deadline
    from public.requests q
    where (p_request_id is null or q.id=p_request_id)
      and q.applicant_id is not null and q.status in ('submitted','under_validation','incomplete','processing')
      and q.payment_status='unpaid' and q.hard_copies_validated_at is null
      and q.registration_conversion is null
      and public.registration_deadline(q.request_type,q.form_data)<v_today
      and not exists (select 1 from public.application_logs l where l.request_id=q.id and l.action_status='ready_for_release')
    order by q.created_at,q.id limit 100 for update of q skip locked
  loop
    v_code:=public.delayed_registration_service(r.request_type,r.form_data,v_today);
    if v_code is null then continue; end if;
    select s.service_code,s.fee,s.fee_per_copy,v.id as version_id into target
    from public.services_registry s join public.service_form_templates b on b.service_code=s.service_code
    join public.form_templates t on t.id=b.template_id
    join public.form_template_versions v on v.id=t.active_version_id and v.status='published'
    where s.service_code=v_code;
    if not found then
      raise warning 'Delayed registration service or published template missing: %',v_code;
      continue;
    end if;
    v_answers:=coalesce(r.form_data,'{}'::jsonb)||jsonb_build_object('registration_type','delayed');
    if v_code like 'DCOLB-%' then
      -- Ordinary registrations do not imply enrollment in the BRAP assistance program.
      v_answers:=v_answers||jsonb_build_object('program','normal',
        'age',case when v_code like 'DCOLB-80UP-%' then '80+' else '0-79' end,
        'marital',case when v_code like '%-NONMARITAL' then 'non-marital' else 'marital' end);
    end if;
    v_note:=format('The on-time registration deadline (%s) has passed. This request was automatically changed to delayed registration. Your tracking number and uploads are kept. Upload the additional delayed-registration requirements, then submit them for review. The fee has been updated for delayed registration.',to_char(r.deadline,'FMMonth FMDD, YYYY'));
    update public.requests set request_type=v_code,form_data=v_answers,
      form_template_version_id=target.version_id,
      fees_due=coalesce(target.fee,0)*case when target.fee_per_copy then greatest(coalesce(r.copies,1),1) else 1 end,
      status='incomplete',posting_start_date=null,posting_end_date=null,
      claimed_by=null,claimed_stage=null,claimed_at=null,claim_expires_at=null,updated_at=now(),
      registration_conversion=jsonb_build_object('from_service',r.request_type,'from_template',r.form_template_version_id,
        'from_fee',r.fees_due,'deadline',r.deadline,'converted_at',now())
    where id=r.id;
    -- The existing files remain; staff must review them against the delayed checklist.
    update public.requirements_attachments set verification_status='pending',rejection_reason=null
      where request_id=r.id and verification_status='approved';
    insert into public.application_logs(request_id,action_status,remarks,performed_by_profile_id)
      values(r.id,'incomplete',v_note,null);
    select email into v_email from auth.users where id=r.applicant_id;
    if v_email is not null then
      insert into public.notifications(request_id,recipient_email,type,subject,body,status)
      values(r.id,v_email,'status_change',format('Request %s: switched to Delayed Registration',r.tracking_number),
        format('Your request %s is now for delayed registration.%s%s%sOpen "My Requests" for the full details.',r.tracking_number,E'\n\n',v_note,E'\n\n'),'pending')
      returning id into v_notification;
      insert into public.registration_delay_notices(request_id,notification_id) values(r.id,v_notification);
    end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.convert_expired_registrations(uuid) from public,anon,authenticated;
grant execute on function public.convert_expired_registrations(uuid) to service_role;

create function public.claim_registration_delay_emails(p_request_id uuid default null)
returns table(notification_id uuid,recipient_email text,subject text,body text)
language sql security definer set search_path = '' as $$
  with candidates as (
    select d.request_id from public.registration_delay_notices d
    join public.notifications n on n.id=d.notification_id join public.requests q on q.id=d.request_id
    where (p_request_id is null or q.id=p_request_id) and n.status<>'sent' and d.attempts<5
      and q.status in ('submitted','under_validation','incomplete','processing')
      and (d.claimed_at is null or d.claimed_at<now()-interval '15 minutes')
    order by d.claimed_at nulls first,d.request_id limit 10 for update of d skip locked
  ), claimed as (
    update public.registration_delay_notices d set claimed_at=now(),attempts=d.attempts+1
    from candidates c where c.request_id=d.request_id returning d.notification_id
  ) select n.id,n.recipient_email::text,n.subject::text,n.body::text
    from public.notifications n join claimed c on c.notification_id=n.id;
$$;
revoke all on function public.claim_registration_delay_emails(uuid) from public,anon,authenticated;
grant execute on function public.claim_registration_delay_emails(uuid) to service_role;

create or replace function public.registration_reminder_deliverable(p_notification_id uuid) returns boolean
language sql security definer set search_path = '' as $$
  select exists (
    select 1 from public.registration_reminders m join public.requests q on q.id=m.request_id
      join public.notifications n on n.id=m.notification_id
    where m.notification_id=p_notification_id and n.status<>'sent' and q.hard_copies_validated_at is null
      and q.status in ('submitted','under_validation','incomplete','processing')
      and not exists(select 1 from public.application_logs l where l.request_id=q.id and l.action_status='ready_for_release')
      and m.deadline=public.registration_deadline(q.request_type,q.form_data)
      and m.deadline-(now() at time zone 'Asia/Manila')::date=m.days_left
  ) or exists (
    select 1 from public.registration_delay_notices d join public.notifications n on n.id=d.notification_id
      join public.requests q on q.id=d.request_id
    where d.notification_id=p_notification_id and n.status<>'sent' and q.registration_conversion is not null
      and q.status in ('submitted','under_validation','incomplete','processing')
  );
$$;

-- Classification continues even if the email provider is unavailable.
create extension if not exists pg_cron;
select cron.schedule('convert-expired-registrations','*/15 * * * *','select public.convert_expired_registrations()');
