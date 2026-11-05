alter table public.requests
  add column hard_copies_validated_at timestamptz,
  add column hard_copies_validated_by uuid references public.profiles(id);

-- Staff must actually check the originals; online acceptance is not this check.
create function public.guard_hard_copy_validation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.hard_copies_validated_at is not null or new.hard_copies_validated_by is not null then
      raise exception 'Hard copies must be checked after submission';
    end if;
    return new;
  end if;
  if new.hard_copies_validated_at is distinct from old.hard_copies_validated_at
     or new.hard_copies_validated_by is distinct from old.hard_copies_validated_by then
    if not public.is_active_user() or not (
      public.get_user_role() = 'admin' or (
        public.get_user_role() in ('staff', 'supervisor') and exists (
          select 1 from public.services_registry s where s.service_code = old.request_type
            and s.department_id = public.get_user_department_id()
        )
      )
    ) then raise exception 'Only assigned CCRO staff can validate hard copies'; end if;
    if old.status not in ('processing', 'ready_for_release') then
      raise exception 'Hard copies can be validated during processing or readiness for release';
    end if;
    if old.hard_copies_validated_at is not null or new.hard_copies_validated_at is null then
      raise exception 'The hard-copy check has already been recorded';
    end if;
    new.hard_copies_validated_at := now();
    new.hard_copies_validated_by := auth.uid();
  end if;
  return new;
end;
$$;
create trigger guard_hard_copy_validation before insert or update on public.requests
for each row execute function public.guard_hard_copy_validation();

create function public.confirm_request_hard_copies(p_request_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  update public.requests set hard_copies_validated_at = now(), hard_copies_validated_by = auth.uid()
  where id = p_request_id and hard_copies_validated_at is null
    and request_type in ('BIRTH_ONTIME','OTCOLB-MARITAL','OTCOLB-NONMARITAL','DEATH_ONTIME','MARRIAGE_ONTIME')
    and status in ('processing','ready_for_release') returning id into v_id;
  if v_id is null then raise exception 'This request cannot have its hard-copy check recorded'; end if;
  insert into public.application_logs(request_id, action_status, remarks, performed_by_profile_id)
  values (v_id, 'hard_copies_validated', 'Original documents and hard copies checked at the CCRO office.', auth.uid());
end;
$$;
revoke all on function public.confirm_request_hard_copies(uuid) from public, anon;
grant execute on function public.confirm_request_hard_copies(uuid) to authenticated;

create function public.registration_deadline(p_code text, p_answers jsonb) returns date
language sql immutable set search_path = '' as $$
  select public.civicheck_safe_date(p_answers->>'event_date') + case
    when upper(p_code) in ('BIRTH_ONTIME','OTCOLB-MARITAL','OTCOLB-NONMARITAL','DEATH_ONTIME') then 30
    when upper(p_code) = 'MARRIAGE_ONTIME' then case p_answers->>'marriage_license_basis'
      when 'with_license' then 15 when 'article_34' then 30 when 'pd_1083' then 30 end
  end;
$$;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in ('status_change','pre_validation_complete','document_rejected','message','registration_reminder')
);

create table public.registration_reminders (
  request_id uuid not null references public.requests(id) on delete cascade,
  deadline date not null,
  days_left integer not null check (days_left in (3,1)),
  notification_id uuid unique references public.notifications(id) on delete cascade,
  claimed_at timestamptz,
  attempts integer not null default 0,
  primary key (request_id, deadline, days_left)
);
alter table public.registration_reminders enable row level security;
revoke all on public.registration_reminders from anon, authenticated;
grant all on public.registration_reminders to service_role;

-- Called only by the scheduled worker. A lease prevents overlapping email sends.
create function public.claim_registration_reminders()
returns table(notification_id uuid, recipient_email text, subject text, body text)
language plpgsql security definer set search_path = '' as $$
declare r record; n_id uuid; v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  if not pg_try_advisory_xact_lock(5311052026) then return; end if;
  for r in
    select q.id, q.tracking_number, u.email, d.deadline, d.deadline-v_today as days_left
    from public.requests q join auth.users u on u.id=q.applicant_id
    cross join lateral (select public.registration_deadline(q.request_type,q.form_data) as deadline) d
    where q.status in ('submitted','under_validation','incomplete','processing','ready_for_release')
      and q.hard_copies_validated_at is null and u.email is not null
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
    with claimed as (
      update public.registration_reminders m set claimed_at=now(), attempts=m.attempts+1
      from public.notifications n, public.requests q
      where n.id=m.notification_id and q.id=m.request_id and n.status <> 'sent'
        and m.deadline-v_today=m.days_left and m.attempts < 5
        and (m.claimed_at is null or m.claimed_at < now()-interval '15 minutes')
        and q.hard_copies_validated_at is null
        and q.status in ('submitted','under_validation','incomplete','processing','ready_for_release')
        and public.registration_deadline(q.request_type,q.form_data)=m.deadline
      returning m.notification_id
    ) select n.id,n.recipient_email::text,n.subject::text,n.body::text
      from public.notifications n join claimed c on c.notification_id=n.id;
end;
$$;
revoke all on function public.claim_registration_reminders() from public, anon, authenticated;
grant execute on function public.claim_registration_reminders() to service_role;
revoke all on function public.guard_hard_copy_validation() from public, anon, authenticated;
