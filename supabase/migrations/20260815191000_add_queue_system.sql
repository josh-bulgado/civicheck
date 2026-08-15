-- Counter queue: the physical queue at the CCRO on the day of the visit.
-- Distinct from `appointments`, which reserves a slot ahead of time.

create table if not exists public.queue_counters (
  id text primary key,
  name text not null,
  lane text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.queue_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null,
  lane text not null check (lane in ('application', 'releasing', 'payment', 'assistance')),
  queue_date date not null default current_date,
  daily_sequence integer not null,

  -- All three are null for an anonymous walk-in who has no account yet.
  request_id uuid references public.requests (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  applicant_id uuid references public.profiles (id) on delete set null,
  walk_in_name text,

  status text not null default 'waiting'
    check (status in ('waiting', 'called', 'serving', 'served', 'no_show', 'cancelled')),
  counter_id text references public.queue_counters (id),
  issue_source text not null
    check (issue_source in ('self_checkin', 'frontdesk', 'walk_in')),
  issued_by uuid references public.profiles (id),

  called_at timestamptz,
  served_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint queue_tickets_daily_sequence_key unique (queue_date, lane, daily_sequence),
  constraint queue_tickets_number_key unique (queue_date, ticket_number)
);

create index if not exists queue_tickets_today_idx
  on public.queue_tickets (queue_date, lane, status, daily_sequence);
create index if not exists queue_tickets_applicant_idx
  on public.queue_tickets (applicant_id, queue_date);

-- A request may move between lanes in a day (application -> payment -> releasing)
-- but must not hold two live tickets in the same lane.
create unique index if not exists queue_tickets_one_active_per_lane_idx
  on public.queue_tickets (queue_date, lane, request_id)
  where request_id is not null and status in ('waiting', 'called', 'serving');

-- ---------------------------------------------------------------------------
-- Ticket issuance
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER because computing the next daily sequence requires reading
-- every ticket for the day, which RLS deliberately hides from applicants.
-- Authorization is therefore enforced explicitly in the body.
create or replace function public.issue_queue_ticket(
  p_lane text,
  p_issue_source text,
  p_request_id uuid default null,
  p_appointment_id uuid default null,
  p_applicant_id uuid default null,
  p_walk_in_name text default null
) returns public.queue_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_staff boolean := public.get_user_role()
    in ('frontdesk', 'staff', 'supervisor', 'cashier', 'admin');
  v_date date := current_date;
  v_seq integer;
  v_prefix text;
  v_ticket public.queue_tickets;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not v_is_staff then
    -- An applicant may only check themselves in, against a real appointment today.
    if p_issue_source <> 'self_checkin' then
      raise exception 'Not permitted to issue queue tickets';
    end if;
    if p_applicant_id is distinct from auth.uid() then
      raise exception 'Not permitted to issue a ticket for another applicant';
    end if;
    if not exists (
      select 1 from public.appointments a
      where a.id = p_appointment_id
        and a.applicant_id = auth.uid()
        and a.appointment_date = v_date
        and a.appointment_status = 'scheduled'
    ) then
      raise exception 'You need a scheduled appointment today to check in';
    end if;
  end if;

  v_prefix := case p_lane
    when 'application' then 'A'
    when 'releasing' then 'B'
    when 'payment' then 'C'
    when 'assistance' then 'D'
    else 'X'
  end;

  -- Serialize numbering per (date, lane) so simultaneous check-ins can't collide.
  perform pg_advisory_xact_lock(hashtext(v_date::text || ':' || p_lane));

  select coalesce(max(daily_sequence), 0) + 1 into v_seq
  from public.queue_tickets
  where queue_date = v_date and lane = p_lane;

  insert into public.queue_tickets (
    ticket_number, lane, queue_date, daily_sequence,
    request_id, appointment_id, applicant_id, walk_in_name,
    issue_source, issued_by
  ) values (
    v_prefix || '-' || lpad(v_seq::text, 3, '0'), p_lane, v_date, v_seq,
    p_request_id, p_appointment_id, p_applicant_id, p_walk_in_name,
    p_issue_source, case when v_is_staff then auth.uid() else null end
  ) returning * into v_ticket;

  return v_ticket;
end;
$$;

revoke execute on function public.issue_queue_ticket(text, text, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.issue_queue_ticket(text, text, uuid, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Calling the next ticket
-- ---------------------------------------------------------------------------

-- FOR UPDATE SKIP LOCKED so two counters calling next at the same moment
-- take two different tickets instead of both grabbing the head of the queue.
create or replace function public.call_next_ticket(
  p_lane text,
  p_counter_id text
) returns public.queue_tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket public.queue_tickets;
begin
  if public.get_user_role()
     not in ('frontdesk', 'staff', 'supervisor', 'cashier', 'admin') then
    raise exception 'Not permitted to call queue tickets';
  end if;

  select * into v_ticket
  from public.queue_tickets
  where queue_date = current_date
    and lane = p_lane
    and status = 'waiting'
  order by daily_sequence
  for update skip locked
  limit 1;

  if v_ticket.id is null then
    return null;
  end if;

  update public.queue_tickets
  set status = 'called',
      counter_id = p_counter_id,
      called_at = now(),
      updated_at = now()
  where id = v_ticket.id
  returning * into v_ticket;

  return v_ticket;
end;
$$;

revoke execute on function public.call_next_ticket(text, text) from public, anon;
grant execute on function public.call_next_ticket(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Public display board
-- ---------------------------------------------------------------------------

-- Exposed to anon for the lobby screen. Returns only the ticket number and
-- where to go — never the applicant, request, or walk-in name.
create or replace function public.queue_now_serving()
returns table (
  ticket_number text,
  lane text,
  status text,
  counter_id text,
  counter_name text,
  called_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select t.ticket_number, t.lane, t.status, t.counter_id, c.name, t.called_at
  from public.queue_tickets t
  left join public.queue_counters c on c.id = t.counter_id
  where t.queue_date = current_date
    and t.status in ('called', 'serving')
  order by t.called_at desc nulls last;
$$;

grant execute on function public.queue_now_serving() to anon, authenticated;

create or replace function public.queue_lane_summary()
returns table (lane text, waiting_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select t.lane, count(*)
  from public.queue_tickets t
  where t.queue_date = current_date and t.status = 'waiting'
  group by t.lane;
$$;

grant execute on function public.queue_lane_summary() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.queue_counters enable row level security;
alter table public.queue_tickets enable row level security;

drop policy if exists "queue_counters_read" on public.queue_counters;
create policy "queue_counters_read" on public.queue_counters
  for select to anon, authenticated using (true);

drop policy if exists "queue_counters_admin_write" on public.queue_counters;
create policy "queue_counters_admin_write" on public.queue_counters
  for all to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "queue_tickets_select_own_or_staff" on public.queue_tickets;
create policy "queue_tickets_select_own_or_staff" on public.queue_tickets
  for select to authenticated
  using (
    applicant_id = auth.uid()
    or public.get_user_role()
       in ('frontdesk', 'staff', 'supervisor', 'cashier', 'admin')
  );

-- Applicants never write directly; self check-in goes through
-- issue_queue_ticket(), which validates their appointment first.
drop policy if exists "queue_tickets_staff_write" on public.queue_tickets;
create policy "queue_tickets_staff_write" on public.queue_tickets
  for all to authenticated
  using (
    public.get_user_role()
      in ('frontdesk', 'staff', 'supervisor', 'cashier', 'admin')
  )
  with check (
    public.get_user_role()
      in ('frontdesk', 'staff', 'supervisor', 'cashier', 'admin')
  );

-- ---------------------------------------------------------------------------
-- Seed counters
-- ---------------------------------------------------------------------------

insert into public.queue_counters (id, name, lane) values
  ('window-1', 'Window 1', 'application'),
  ('window-2', 'Window 2', 'application'),
  ('window-3', 'Window 3', 'payment'),
  ('window-4', 'Window 4', 'releasing'),
  ('help-desk', 'Help Desk', 'assistance')
on conflict (id) do nothing;
