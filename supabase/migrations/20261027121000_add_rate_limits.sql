-- Fixed-window attempt counters for the unauthenticated endpoints: sign-in,
-- sign-up and password-reset codes, code verification, and the public
-- tracking lookup. Every Supabase Auth call comes from the app server's single
-- address, so Supabase's own per-IP limits can't tell one visitor from another;
-- these count per email and per visitor address instead.
--
-- Buckets are opaque keys built by src/server/rate-limit.ts (identifiers are
-- HMAC'd before they get here). Only the service role reaches this.

create table if not exists public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  hit_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_hit_at_idx
  on public.rate_limit_hits (bucket, hit_at);

alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Records one attempt and says whether it was within the limit. Attempts over
-- the limit are not recorded, so a blocked caller is let back in once the
-- window has passed since their earlier attempts.
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_recent integer;
begin
  -- Serializes concurrent attempts on one bucket so parallel requests cannot
  -- all read the same count and slip past it together.
  perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || p_bucket, 0));

  delete from public.rate_limit_hits
  where bucket = p_bucket
    and hit_at <= now() - make_interval(secs => p_window_seconds);

  select count(*) into v_recent
  from public.rate_limit_hits
  where bucket = p_bucket;

  if v_recent >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_hits (bucket) values (p_bucket);

  -- Buckets nobody comes back to are never swept above, so now and then clear
  -- anything older than the longest window in use.
  if random() < 0.01 then
    delete from public.rate_limit_hits where hit_at < now() - interval '1 day';
  end if;

  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;
