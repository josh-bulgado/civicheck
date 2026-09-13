-- Service-level reporting for the CCRO admin Reports page.
--
-- CiviCheck holds two distinct time axes, and a report that conflates them is
-- worse than no report at all:
--
--   * demand  -- requests.created_at, i.e. when someone came to the office
--   * event   -- form_data->>'event_date', i.e. when the marriage / birth /
--               death being registered actually happened
--
-- Aggregation lives here rather than in the app server on purpose. The event
-- axis lives inside form_data, which carries citizen PII; doing this in
-- TypeScript would mean shipping every applicant's form blob out of the data
-- layer to count it. This function returns counts only -- no names, no
-- form_data rows, no attachment paths ever cross the boundary.

-- ── Safe date parsing ───────────────────────────────────────────────────────
--
-- `event_date` is free-form text inside jsonb. A regex guard alone is not
-- enough: '2026-02-30' matches ^\d{4}-\d{2}-\d{2}$ and still raises on cast,
-- which would take down the whole report. `language sql` cannot trap that, so
-- the cast is isolated in a plpgsql wrapper that swallows it.

create or replace function public.civicheck_safe_date(p_value text)
returns date
language plpgsql
immutable
parallel safe
set search_path = public
as $$
begin
  if p_value is null or p_value !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  return p_value::date;
exception
  when others then
    return null;
end;
$$;

comment on function public.civicheck_safe_date(text) is
  'Parses a YYYY-MM-DD string to date, returning NULL for anything unparseable. Never raises.';

-- ── The report ──────────────────────────────────────────────────────────────
--
-- security invoker (the default, stated explicitly): RLS applies as the
-- caller, so an admin sees the whole office and a department-scoped role sees
-- only its own department. Defence in depth behind the route's
-- `dashboard:admin` guard -- no security definer is needed or wanted here.
--
-- Services are grouped on coalesce(display_group, service_code): 14 of the 25
-- registry codes are case variants of 5 user-visible services, so grouping on
-- the raw code produces six near-identical "Delayed COLB" rows.

create or replace function public.ccro_service_report(
  p_start timestamptz,
  p_end timestamptz,
  p_service text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with scoped as (
  select
    r.id,
    r.status,
    r.created_at,
    r.applicant_id,
    coalesce(s.display_group, s.service_code) as service_key,
    coalesce(s.display_name, s.name)          as service_label,
    s.department_id,
    s.event_date_label,
    s.event_date_direction,
    s.asks_purpose,
    public.civicheck_safe_date(r.form_data ->> 'event_date')      as event_date,
    nullif(btrim(coalesce(r.form_data ->> 'purpose', '')), '')     as purpose,
    nullif(btrim(coalesce(r.form_data ->> 'subject_sex', '')), '') as subject_sex,
    nullif(btrim(coalesce(r.form_data ->> 'party2_sex', '')), '')  as party2_sex
  from public.requests r
  join public.services_registry s on s.service_code = r.request_type
  where r.created_at >= p_start
    and r.created_at < p_end
),
-- Earliest release event wins: a request re-released after a correction must
-- not be counted as having taken longer than it did.
released as (
  select l.request_id, min(l.created_at) as released_at
  from public.application_logs l
  join scoped sc on sc.id = l.request_id
  where l.action_status = 'released'
  group by l.request_id
),
-- "Incomplete" is a state a request passed through, not only where it sits
-- now -- a request fixed and released still needed a completeness follow-up.
flagged_incomplete as (
  select distinct l.request_id
  from public.application_logs l
  join scoped sc on sc.id = l.request_id
  where l.action_status = 'incomplete'
),
enriched as (
  select
    sc.*,
    case
      when rel.released_at >= sc.created_at
        then extract(epoch from (rel.released_at - sc.created_at)) / 86400.0
    end as release_days,
    (sc.status = 'incomplete' or fi.request_id is not null) as ever_incomplete
  from scoped sc
  left join released rel on rel.request_id = sc.id
  left join flagged_incomplete fi on fi.request_id = sc.id
),
per_service as (
  select
    service_key,
    min(service_label)                                                as service_label,
    min(department_id)                                                as department_id,
    bool_or(asks_purpose)                                             as asks_purpose,
    min(event_date_label)                                             as event_date_label,
    min(event_date_direction)                                         as event_date_direction,
    count(*)::int                                                     as total,
    count(*) filter (where status = 'released')::int                  as released,
    count(*) filter (where ever_incomplete)::int                      as incomplete,
    count(*) filter (where status = 'rejected')::int                  as rejected,
    count(*) filter (where status not in ('released', 'rejected'))::int as pending,
    count(*) filter (where applicant_id is null)::int                 as walk_in,
    count(event_date)::int                                            as event_dated,
    round(avg(release_days)::numeric, 1)                              as avg_release_days,
    count(release_days)::int                                          as release_sample
  from enriched
  group by service_key
),
-- The caller may name a service; otherwise the busiest one is profiled, so the
-- Insight tab always opens on something worth looking at.
target as (
  select coalesce(
    nullif(btrim(coalesce(p_service, '')), ''),
    (select service_key from per_service order by total desc, service_key limit 1)
  ) as service_key
),
insight_rows as (
  select e.*
  from enriched e
  join target t on t.service_key = e.service_key
),
-- Month-of-year, aggregated across every year in range: the question is
-- "which months do people marry in", not "what happened in March 2026".
seasonality as (
  select g.m as month, count(i.id)::int as count
  from generate_series(1, 12) as g(m)
  left join insight_rows i
    on i.event_date is not null
   and extract(month from i.event_date) = g.m
  group by g.m
),
-- How long after the event the request was filed. Negative means the event is
-- still ahead (marriage licences carry an intended, future date).
lag_bucketed as (
  select
    case
      when d <  0    then 'upcoming'
      when d =  0    then 'same_day'
      when d <= 30   then 'within_30d'
      when d <= 365  then 'within_1y'
      when d <= 1825 then 'within_5y'
      when d <= 6570 then 'within_18y'
      else                'over_18y'
    end as bucket
  from (
    select (i.created_at at time zone 'Asia/Manila')::date - i.event_date as d
    from insight_rows i
    where i.event_date is not null
  ) as lags
),
sexes as (
  select sex, count(*)::int as count
  from (
    select subject_sex as sex from insight_rows where subject_sex is not null
    union all
    select party2_sex  as sex from insight_rows where party2_sex  is not null
  ) as parties
  group by sex
),
purposes as (
  select purpose, count(*)::int as count
  from insight_rows
  where purpose is not null
  group by purpose
),
upcoming as (
  select i.event_date as on_date, count(*)::int as count
  from insight_rows i
  where i.event_date is not null
    and i.event_date >= (now() at time zone 'Asia/Manila')::date
    and i.event_date <  (now() at time zone 'Asia/Manila')::date + 90
  group by i.event_date
)
select jsonb_build_object(
  'period', jsonb_build_object('start', p_start, 'end', p_end),
  'totals', (
    select jsonb_build_object(
      'requests',   coalesce(sum(total), 0),
      'released',   coalesce(sum(released), 0),
      'incomplete', coalesce(sum(incomplete), 0),
      'rejected',   coalesce(sum(rejected), 0),
      'pending',    coalesce(sum(pending), 0)
    )
    from per_service
  ),
  'services', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'key',                ps.service_key,
        'label',              ps.service_label,
        'departmentId',       ps.department_id,
        'total',              ps.total,
        'released',           ps.released,
        'incomplete',         ps.incomplete,
        'rejected',           ps.rejected,
        'pending',            ps.pending,
        'walkIn',             ps.walk_in,
        'eventDated',         ps.event_dated,
        'avgReleaseDays',     ps.avg_release_days,
        'releaseSample',      ps.release_sample,
        'asksPurpose',        ps.asks_purpose,
        'eventDateLabel',     ps.event_date_label,
        'eventDateDirection', ps.event_date_direction
      )
      order by ps.total desc, ps.service_label
    )
    from per_service ps
  ), '[]'::jsonb),
  'insight', jsonb_build_object(
    'serviceKey',  (select service_key from target),
    'sampleSize',  (select count(*)::int from insight_rows),
    'eventDated',  (select count(event_date)::int from insight_rows),
    'seasonality', coalesce((
      select jsonb_agg(jsonb_build_object('month', month, 'count', count) order by month)
      from seasonality
    ), '[]'::jsonb),
    'lag', coalesce((
      select jsonb_object_agg(bucket, n)
      from (select bucket, count(*)::int as n from lag_bucketed group by bucket) as b
    ), '{}'::jsonb),
    'sex', coalesce((
      select jsonb_object_agg(sex, count) from sexes
    ), '{}'::jsonb),
    'purpose', coalesce((
      select jsonb_object_agg(purpose, count) from purposes
    ), '{}'::jsonb),
    'channel', (
      select jsonb_build_object(
        'walkIn', count(*) filter (where applicant_id is null)::int,
        'online', count(*) filter (where applicant_id is not null)::int
      )
      from insight_rows
    ),
    'upcoming', coalesce((
      select jsonb_agg(jsonb_build_object('date', on_date, 'count', count) order by on_date)
      from upcoming
    ), '[]'::jsonb)
  )
);
$$;

comment on function public.ccro_service_report(timestamptz, timestamptz, text) is
  'Aggregate-only service report for the CCRO admin Reports page. Returns counts grouped by coalesce(display_group, service_code); never returns citizen form data.';

revoke all on function public.ccro_service_report(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.ccro_service_report(timestamptz, timestamptz, text) to authenticated;
grant execute on function public.civicheck_safe_date(text) to authenticated, anon;

-- ── Indexes ─────────────────────────────────────────────────────────────────
-- application_logs is joined on request_id by every branch above and had no
-- index on it at all; the report also filters it by action_status.

create index if not exists application_logs_request_id_idx
  on public.application_logs (request_id);

create index if not exists application_logs_status_created_idx
  on public.application_logs (action_status, created_at desc);

create index if not exists requests_event_date_idx
  on public.requests (((form_data ->> 'event_date')));
