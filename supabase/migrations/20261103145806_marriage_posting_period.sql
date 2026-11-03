alter table public.requests
  add column if not exists posting_start_date date,
  add column if not exists posting_end_date date;

create or replace function public.guard_marriage_posting()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  changed boolean;
  actor_role text;
  today date := (current_timestamp at time zone 'Asia/Manila')::date;
begin
  if new.request_type is distinct from 'MARRIAGE_DELAYED' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.posting_start_date is not null or new.posting_end_date is not null then
      raise exception 'Record the posting date during Processing';
    end if;
    return new;
  end if;

  changed := row(new.posting_start_date, new.posting_end_date)
    is distinct from row(old.posting_start_date, old.posting_end_date);
  if changed then
    actor_role := public.get_user_role();
    if current_user in ('anon', 'authenticated') and
      (actor_role is null or actor_role not in ('staff', 'supervisor', 'admin')) then
      raise exception 'Only CCRO staff can record the posting date';
    end if;
    if old.status is distinct from 'processing' or new.status is distinct from 'processing' then
      raise exception 'Record the posting date during Processing';
    end if;
    if new.posting_start_date > today then
      raise exception 'The posting date cannot be in the future';
    end if;
    if new.posting_start_date < (new.created_at at time zone 'Asia/Manila')::date then
      raise exception 'The posting date cannot precede the request';
    end if;
    -- The end date is always calculated here, never supplied by a client.
    new.posting_end_date := new.posting_start_date + 10;
  end if;

  if new.status is distinct from old.status and new.status in ('ready_for_release', 'released') then
    if new.posting_start_date is null or new.posting_end_date is null
      or new.posting_end_date <> new.posting_start_date + 10
      or today < new.posting_end_date then
      raise exception 'Complete the 10-calendar-day notice of posting first';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_marriage_posting() from public, anon, authenticated;

create trigger guard_marriage_posting
before insert or update on public.requests
for each row execute function public.guard_marriage_posting();
