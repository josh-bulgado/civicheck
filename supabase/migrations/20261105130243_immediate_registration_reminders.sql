-- Immediate submissions and the scheduled check share the same deduplication.
drop function public.claim_registration_reminders();
create or replace function public.claim_registration_reminders(p_request_id uuid default null)
returns table(notification_id uuid, recipient_email text, subject text, body text)
language plpgsql security definer set search_path = '' as $$
declare r record; n_id uuid; v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  perform pg_advisory_xact_lock(5311052026);
  for r in
    select q.id, q.tracking_number, u.email, d.deadline, d.deadline-v_today as days_left
    from public.requests q join auth.users u on u.id=q.applicant_id
    cross join lateral (select public.registration_deadline(q.request_type,q.form_data) as deadline) d
    where q.status in ('submitted','under_validation','incomplete','processing')
      and (p_request_id is null or q.id=p_request_id)
      and q.hard_copies_validated_at is null
      and not exists (select 1 from public.application_logs l where l.request_id=q.id and l.action_status='ready_for_release') and u.email is not null
      and public.civicheck_safe_date(q.form_data->>'event_date') <= v_today
      and d.deadline-v_today in (3,1)
  loop
    insert into public.registration_reminders(request_id, deadline, days_left)
      values (r.id,r.deadline,r.days_left) on conflict do nothing;
    if exists (select 1 from public.registration_reminders m
      where m.request_id=r.id and m.deadline=r.deadline and m.days_left=r.days_left and m.notification_id is null) then
      insert into public.notifications(request_id,recipient_email,type,subject,body,status)
      values (r.id,r.email,'registration_reminder',
        format('Request %s: %s %s left to complete registration',r.tracking_number,r.days_left,case when r.days_left=1 then 'day' else 'days' end),
        format('Your on-time registration deadline is %s (%s %s left).%sBring your original documents and hard copies of your requirements to the CCRO office for final validation before the deadline. Submitting online does not complete registration.%sOpen "My Requests" for the full details.',
          to_char(r.deadline,'FMMonth FMDD, YYYY'),r.days_left,case when r.days_left=1 then 'day' else 'days' end,E'\n\n',E'\n\n'), 'pending')
      returning id into n_id;
      update public.registration_reminders m set notification_id=n_id
        where m.request_id=r.id and m.deadline=r.deadline and m.days_left=r.days_left;
    end if;
  end loop;
  return query
    with candidates as (
      select m.request_id,m.deadline,m.days_left
      from public.registration_reminders m, public.notifications n, public.requests q
      where n.id=m.notification_id and q.id=m.request_id and n.status <> 'sent'
        and m.deadline-v_today=m.days_left and m.attempts < 5
        and (m.claimed_at is null or m.claimed_at < now()-interval '15 minutes')
        and (p_request_id is null or q.id=p_request_id)
      and q.hard_copies_validated_at is null
      and not exists (select 1 from public.application_logs l where l.request_id=q.id and l.action_status='ready_for_release')
        and q.status in ('submitted','under_validation','incomplete','processing')
        and public.registration_deadline(q.request_type,q.form_data)=m.deadline
      order by m.claimed_at nulls first, m.request_id
      limit 10
      for update of m skip locked
    ), claimed as (
      update public.registration_reminders m set claimed_at=now(),attempts=m.attempts+1
      from candidates c where m.request_id=c.request_id and m.deadline=c.deadline and m.days_left=c.days_left
      returning m.notification_id
    ) select n.id,n.recipient_email::text,n.subject::text,n.body::text
      from public.notifications n join claimed c on c.notification_id=n.id;
end;
$$;
revoke all on function public.claim_registration_reminders(uuid) from public, anon, authenticated;
grant execute on function public.claim_registration_reminders(uuid) to service_role;

create function public.queue_submission_registration_reminder() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_url text; v_secret text; v_remaining integer;
begin
  if new.applicant_id is null or new.status <> 'submitted' then return new; end if;
  v_remaining := public.registration_deadline(new.request_type,new.form_data)-(now() at time zone 'Asia/Manila')::date;
  if v_remaining is null or v_remaining not in (3,1) then return new; end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name='registration_reminder_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='registration_reminder_secret';
  if v_url is null or v_secret is null then return new; end if;
  -- pg_net starts the request after this submission transaction commits.
  perform net.http_post(url:=v_url,headers:=jsonb_build_object(
    'Content-Type','application/json','x-reminder-secret',v_secret
  ),body:=jsonb_build_object('request_id',new.id),timeout_milliseconds:=60000);
  return new;
exception when others then
  -- A sender outage must not reject the application. The cron job retries.
  raise warning 'Could not queue immediate registration reminder (%)',sqlstate;
  return new;
end;
$$;
revoke all on function public.queue_submission_registration_reminder() from public, anon, authenticated;
create trigger queue_submission_registration_reminder after insert on public.requests
for each row execute function public.queue_submission_registration_reminder();
