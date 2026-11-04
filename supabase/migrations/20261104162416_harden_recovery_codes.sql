-- Recovery-only state. Signup continues to use Supabase's existing OTP flow.
create table public.password_recovery_challenges (
  email_bucket text primary key,
  id uuid not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  code_hash text check (code_hash is null or code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  wrong_attempts integer not null default 0 check (wrong_attempts between 0 and 5),
  consumed_at timestamptz,
  reset_grant_hash text check (reset_grant_hash is null or reset_grant_hash ~ '^[0-9a-f]{64}$'),
  reset_grant_expires_at timestamptz,
  reset_used_at timestamptz
);
alter table public.password_recovery_challenges enable row level security;
revoke all on public.password_recovery_challenges from public, anon, authenticated;
grant select, insert, update, delete on public.password_recovery_challenges to service_role;
grant select, insert, update, delete on public.rate_limit_hits to service_role;
grant usage on sequence public.rate_limit_hits_id_seq to service_role;

-- Use the existing shared rate-limit table, admitting IP, email and resend
-- cooldown together. Unknown emails spend exactly the same allowance.
create function public.reserve_recovery_send(
  p_email_bucket text, p_ip_bucket text, p_id uuid, p_code_hash text
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_bucket text;
  v_email_count integer;
  v_ip_count integer;
  v_last timestamptz;
  v_retry timestamptz;
begin
  for v_bucket in select unnest(array[p_email_bucket, p_ip_bucket]) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || v_bucket, 0));
  end loop;
  delete from public.rate_limit_hits where bucket in (p_email_bucket, p_ip_bucket)
    and hit_at <= now() - interval '1 hour';
  select count(*), max(hit_at) into v_email_count, v_last
    from public.rate_limit_hits where bucket = p_email_bucket;
  select count(*) into v_ip_count from public.rate_limit_hits where bucket = p_ip_bucket;
  if v_email_count >= 3 then
    select min(hit_at) + interval '1 hour' into v_retry
      from public.rate_limit_hits where bucket = p_email_bucket;
  end if;
  if v_ip_count >= 10 then
    select greatest(v_retry, min(hit_at) + interval '1 hour') into v_retry
      from public.rate_limit_hits where bucket = p_ip_bucket;
  end if;
  if v_last > now() - interval '60 seconds' then
    v_retry := greatest(v_retry, v_last + interval '60 seconds');
  end if;
  if v_retry is not null then
    return jsonb_build_object('allowed', false,
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from v_retry - now()))));
  end if;
  insert into public.rate_limit_hits(bucket) values (p_email_bucket), (p_ip_bucket);
  insert into public.password_recovery_challenges(email_bucket, id, code_hash, expires_at)
    values (p_email_bucket, p_id, p_code_hash, now() + interval '10 minutes')
    on conflict (email_bucket) do update set id = excluded.id,
      user_id = null, code_hash = excluded.code_hash, expires_at = excluded.expires_at,
      wrong_attempts = 0, consumed_at = null, reset_grant_hash = null,
      reset_grant_expires_at = null, reset_used_at = null;
  -- Low-volume, bounded cleanup using the same convention as consume_rate_limit.
  if random() < 0.01 then
    delete from public.password_recovery_challenges where expires_at < now() - interval '1 day';
    delete from public.rate_limit_hits where hit_at < now() - interval '1 day';
  end if;
  return jsonb_build_object('allowed', true, 'retryAfterSeconds', 60);
end;
$$;

-- The app compares fixed-length HMAC digests with node:crypto timingSafeEqual.
-- This RPC atomically commits the outcome against the still-current code, so
-- simultaneous guesses, resends, and duplicate correct submissions cannot race.
create function public.finish_recovery_code_check(
  p_email_bucket text, p_id uuid, p_matched boolean, p_grant_hash text
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_code public.password_recovery_challenges%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || p_email_bucket, 0));
  select * into v_code from public.password_recovery_challenges
    where email_bucket = p_email_bucket for update;
  if not found then return 'wrong'; end if;
  if v_code.id is distinct from p_id or v_code.consumed_at is not null
      or v_code.code_hash is null or v_code.wrong_attempts >= 5 or v_code.expires_at <= now() then
    return 'invalid';
  end if;
  if p_matched and v_code.user_id is not null then
    update public.password_recovery_challenges set code_hash = null, consumed_at = now(),
      reset_grant_hash = p_grant_hash, reset_grant_expires_at = now() + interval '10 minutes'
      where email_bucket = p_email_bucket;
    return 'verified';
  end if;
  update public.password_recovery_challenges set wrong_attempts = wrong_attempts + 1,
    code_hash = case when wrong_attempts >= 4 then null else code_hash end
    where email_bucket = p_email_bucket;
  return case when v_code.wrong_attempts >= 4 then 'invalid' else 'wrong' end;
end;
$$;

-- The random 256-bit reset grant is only in an HttpOnly cookie; its HMAC is in
-- Postgres. Consuming it before the Auth update prevents concurrent/replayed
-- password changes. A failed update requires a fresh recovery request.
create function public.consume_password_reset_grant(p_id uuid, p_grant_hash text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_user uuid;
begin
  update public.password_recovery_challenges set reset_used_at = now(), reset_grant_hash = null
    where id = p_id and reset_grant_hash = p_grant_hash and user_id is not null
      and consumed_at is not null and reset_used_at is null and reset_grant_expires_at > now()
    returning user_id into v_user;
  return v_user;
end;
$$;

revoke all on function public.reserve_recovery_send(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.finish_recovery_code_check(text, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.consume_password_reset_grant(uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_recovery_send(text, text, uuid, text) to service_role;
grant execute on function public.finish_recovery_code_check(text, uuid, boolean, text) to service_role;
grant execute on function public.consume_password_reset_grant(uuid, text) to service_role;
