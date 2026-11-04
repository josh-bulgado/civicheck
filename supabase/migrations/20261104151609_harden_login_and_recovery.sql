-- Extend the existing shared limiter, rather than introducing another counter.
-- Reservations count while Auth is running; only failures survive completion.
alter table public.rate_limit_hits
  add column attempt_id uuid,
  add column lease_until timestamptz,
  add column account_bucket text;
create index rate_limit_hits_attempt_id_idx on public.rate_limit_hits (attempt_id)
  where attempt_id is not null;
grant select, insert, update, delete on public.rate_limit_hits to service_role;
grant usage on sequence public.rate_limit_hits_id_seq to service_role;

create function public.reserve_login_attempt(p_pair text, p_ip text, p_account text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_bucket text;
  v_pair_count integer;
  v_ip_count integer;
  v_account_count integer;
  v_until timestamptz;
  v_attempt uuid := gen_random_uuid();
begin
  -- One transaction admits both limits. Sorted locks avoid deadlocks.
  for v_bucket in select unnest(array[p_pair, p_ip, p_account]) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || v_bucket, 0));
  end loop;
  delete from public.rate_limit_hits
    where bucket in (p_pair, p_ip, p_account) and
      ((lease_until is not null and lease_until <= clock_timestamp()) or
       hit_at <= now() - interval '1 hour');
  select count(*) into v_pair_count from public.rate_limit_hits
    where bucket = p_pair and hit_at > now() - interval '15 minutes';
  select count(*) into v_ip_count from public.rate_limit_hits
    where bucket = p_ip and hit_at > now() - interval '15 minutes';
  select count(*) into v_account_count from public.rate_limit_hits
    where bucket = p_account and hit_at > now() - interval '1 hour';
  if v_pair_count >= 5 or v_ip_count >= 20 then
    select max(deadline) into v_until from (
      select min(coalesce(lease_until, hit_at + interval '15 minutes')) as deadline
      from public.rate_limit_hits where bucket = p_pair and v_pair_count >= 5
        and hit_at > now() - interval '15 minutes'
      union all
      select min(coalesce(lease_until, hit_at + interval '15 minutes'))
      from public.rate_limit_hits where bucket = p_ip and v_ip_count >= 20
        and hit_at > now() - interval '15 minutes'
    ) deadlines;
    return jsonb_build_object('allowed', false, 'attemptsRemaining', 0,
      'lockedUntil', floor(extract(epoch from v_until) * 1000));
  end if;
  insert into public.rate_limit_hits(bucket, attempt_id, lease_until, account_bucket)
    values (p_pair, v_attempt, now() + interval '60 seconds', p_account),
           (p_ip, v_attempt, now() + interval '60 seconds', p_account);
  return jsonb_build_object('allowed', true, 'attemptId', v_attempt,
    'attemptsRemaining', least(4 - v_pair_count, 19 - v_ip_count),
    'elevated', v_account_count >= 30);
end;
$$;

create function public.finish_login_attempt(p_attempt uuid, p_success boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_pair text;
  v_ip text;
  v_account text;
  v_bucket text;
  v_count integer;
  v_ip_count integer;
  v_account_count integer;
  v_until timestamptz;
  v_notify boolean := false;
begin
  select max(bucket) filter (where bucket like 'sign-in:pair:%'),
    max(bucket) filter (where bucket like 'sign-in:ip:%'), max(account_bucket)
    into v_pair, v_ip, v_account
    from public.rate_limit_hits where attempt_id = p_attempt;
  if v_pair is null or v_ip is null or v_account is null then
    raise exception 'Unknown login reservation';
  end if;
  for v_bucket in select unnest(array[v_pair, v_ip, v_account]) order by 1 loop
    perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || v_bucket, 0));
  end loop;
  -- A stale or repeated completion cannot create failures or clear counters.
  if (select count(*) from public.rate_limit_hits
      where attempt_id = p_attempt and lease_until > clock_timestamp()) <> 2 then
    raise exception 'Expired login reservation';
  end if;
  if p_success then
    delete from public.rate_limit_hits where attempt_id = p_attempt
      or (bucket = v_pair and lease_until is null);
    return jsonb_build_object('attemptsRemaining', 5, 'notify', false);
  end if;
  update public.rate_limit_hits set attempt_id = null, lease_until = null,
    account_bucket = null, hit_at = now() where attempt_id = p_attempt;
  -- Record every failure in the rolling hour. Never use this as an admission
  -- gate, and never clear it when another IP signs in successfully.
  insert into public.rate_limit_hits(bucket) values (v_account);
  select count(*) into v_account_count from public.rate_limit_hits
    where bucket = v_account and hit_at > now() - interval '1 hour';
  if v_account_count >= 30 then
    v_notify := public.consume_rate_limit('login-alert:' || v_account, 1, 3600);
  end if;
  select count(*) into v_count from public.rate_limit_hits
    where bucket = v_pair and hit_at > now() - interval '15 minutes';
  select count(*) into v_ip_count from public.rate_limit_hits
    where bucket = v_ip and hit_at > now() - interval '15 minutes';
  if v_count >= 5 or v_ip_count >= 20 then
    select max(deadline) into v_until from (
      select min(coalesce(lease_until, hit_at + interval '15 minutes')) as deadline
      from public.rate_limit_hits where bucket = v_pair and v_count >= 5
        and hit_at > now() - interval '15 minutes'
      union all
      select min(coalesce(lease_until, hit_at + interval '15 minutes'))
      from public.rate_limit_hits where bucket = v_ip and v_ip_count >= 20
        and hit_at > now() - interval '15 minutes'
    ) deadlines;
  end if;
  return jsonb_build_object('attemptsRemaining', greatest(0, least(5 - v_count, 20 - v_ip_count)),
    'lockedUntil', floor(extract(epoch from v_until) * 1000), 'notify', v_notify);
end;
$$;

revoke all on function public.reserve_login_attempt(text, text, text) from public, anon, authenticated;
revoke all on function public.finish_login_attempt(uuid, boolean) from public, anon, authenticated;
grant execute on function public.reserve_login_attempt(text, text, text) to service_role;
grant execute on function public.finish_login_attempt(uuid, boolean) to service_role;

-- Auth owns hashes. Return only the trusted address and timing metadata, never
-- a password/hash. This privileged lookup is inaccessible to browser roles.
create function public.login_account_security_info(p_email text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user auth.users%rowtype;
  v_cost integer;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' then
    raise insufficient_privilege;
  end if;
  select * into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  -- Match the cost of this project's most recently created bcrypt credential.
  -- Supabase defaults to bcrypt cost 10 before the first password user exists.
  if v_user.id is null or coalesce(v_user.encrypted_password, '') = '' then
    select substring(encrypted_password from 5 for 2)::integer into v_cost
      from auth.users where encrypted_password ~ '^\$2[aby]\$[0-9]{2}\$'
      order by created_at desc limit 1;
  end if;
  return jsonb_build_object('email', case when v_user.email_confirmed_at is not null then v_user.email else null end,
    'needsDummyPassword', v_user.id is null or coalesce(v_user.encrypted_password, '') = '',
    'bcryptCost', coalesce(v_cost, 10));
end;
$$;
revoke all on function public.login_account_security_info(text) from public, anon, authenticated;
grant execute on function public.login_account_security_info(text) to service_role;
