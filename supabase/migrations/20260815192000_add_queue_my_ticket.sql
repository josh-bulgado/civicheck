-- An applicant can only see their own ticket under RLS, so they cannot count
-- how many people are ahead of them. This returns their live ticket together
-- with that position, without exposing anyone else's row.

create or replace function public.queue_my_ticket()
returns table (
  id uuid,
  ticket_number text,
  lane text,
  status text,
  counter_id text,
  counter_name text,
  ahead_count bigint,
  called_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    t.id,
    t.ticket_number,
    t.lane,
    t.status,
    t.counter_id,
    c.name,
    (
      select count(*)
      from public.queue_tickets q
      where q.queue_date = current_date
        and q.lane = t.lane
        and q.status = 'waiting'
        and q.daily_sequence < t.daily_sequence
    ),
    t.called_at,
    t.created_at
  from public.queue_tickets t
  left join public.queue_counters c on c.id = t.counter_id
  where t.applicant_id = auth.uid()
    and t.queue_date = current_date
    and t.status in ('waiting', 'called', 'serving')
  order by t.daily_sequence
  limit 1;
$$;

revoke execute on function public.queue_my_ticket() from public, anon;
grant execute on function public.queue_my_ticket() to authenticated;
