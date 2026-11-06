-- Applicant submissions share one ID across retries and browser tabs.
alter table public.requests add column submission_key uuid;
create unique index requests_applicant_submission_key
  on public.requests (applicant_id, submission_key);
create index if not exists requests_applicant_created_at_idx
  on public.requests (applicant_id, created_at desc);

create or replace function public.guard_online_submission()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_count integer;
  first_submission timestamptz;
  wait_minutes integer;
begin
  if tg_op = 'UPDATE' then
    if new.submission_key is distinct from old.submission_key then
      raise exception 'The application submission ID cannot be changed.';
    end if;
    return new;
  end if;

  -- Staff walk-in encoding has no applicant account.
  if new.applicant_id is null then return new; end if;
  -- Older deployed clients may omit the ID; the shared server now requires it.
  -- Keep their submissions working during rollout while still enforcing the limit.

  -- Serialize this account across all services, including simultaneous tabs.
  perform pg_advisory_xact_lock(hashtextextended('online-submission:' || new.applicant_id::text, 0));
  if exists (
    select 1 from public.requests
    where applicant_id = new.applicant_id and submission_key = new.submission_key
  ) then
    raise exception 'requests_applicant_submission_key: application already submitted'
      using errcode = '23505';
  end if;

  select count(*), min(created_at) into recent_count, first_submission
  from public.requests
  where applicant_id = new.applicant_id
    and created_at > clock_timestamp() - interval '1 hour';
  if recent_count >= 5 then
    wait_minutes := greatest(1, ceil(extract(epoch from
      (first_submission + interval '1 hour' - clock_timestamp())) / 60)::integer);
    raise exception 'You can submit up to 5 requests per hour across all services. Please try again in % minute(s).', wait_minutes;
  end if;
  new.created_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function public.guard_online_submission() from public, anon, authenticated;
grant execute on function public.guard_online_submission() to service_role;
create trigger guard_online_submission
  before insert or update on public.requests
  for each row execute function public.guard_online_submission();
