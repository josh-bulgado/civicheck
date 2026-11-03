-- System Health: the schedule.
--
-- Installs pg_cron and pg_net and defines two helpers. It schedules nothing by itself.
-- Run it only after the health-probe Edge Function is deployed, then follow
-- supabase/functions/health-probe/README.md to create the secrets and switch the
-- schedule on with: select public.system_health_install_schedule();

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Creates the Vault secrets the schedule reads. The shared secret is generated here, so it
-- never passes through a chat or a script. Read it once from the Vault to copy it into the
-- Edge Function secret HEALTH_PROBE_SECRET and the app's .env. Safe to run again: it never
-- replaces a secret that exists.
create or replace function public.system_health_prepare_secrets(p_function_url text)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if p_function_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/health-probe$' then
    raise exception 'Expected https://<project-ref>.supabase.co/functions/v1/health-probe';
  end if;
  if not exists (select 1 from vault.secrets where name = 'health_probe_url') then
    perform vault.create_secret(p_function_url, 'health_probe_url', 'Where the schedule calls the health-probe function');
  end if;
  if not exists (select 1 from vault.secrets where name = 'health_probe_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'health_probe_secret',
      'Shared secret for the health-probe function'
    );
  end if;
  return jsonb_build_object('url_set', true, 'secret_set', true);
end;
$$;

-- Switches the checks on: every 15 minutes, plus a nightly prune of old rows.
create or replace function public.system_health_install_schedule()
returns jsonb
language plpgsql
security definer
set search_path = public, vault, cron, net
as $$
begin
  if not exists (select 1 from vault.secrets where name = 'health_probe_url')
     or not exists (select 1 from vault.secrets where name = 'health_probe_secret') then
    raise exception 'Run system_health_prepare_secrets first.';
  end if;

  perform cron.unschedule(jobname) from cron.job
  where jobname in ('system-health-probe', 'system-health-prune');

  perform cron.schedule('system-health-probe', '*/15 * * * *', $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'health_probe_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-health-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'health_probe_secret')
      ),
      body := jsonb_build_object('run_kind', 'scheduled'),
      timeout_milliseconds := 20000
    );
  $job$);

  perform cron.schedule('system-health-prune', '17 3 * * *', 'select public.system_health_prune()');

  return jsonb_build_object('scheduled', true);
end;
$$;

-- Switches the checks off. The rows and the secrets stay.
create or replace function public.system_health_remove_schedule()
returns void
language sql
security definer
set search_path = public, cron
as $$
  select cron.unschedule(jobname) from cron.job
  where jobname in ('system-health-probe', 'system-health-prune');
$$;

revoke all on function public.system_health_prepare_secrets(text) from public, anon, authenticated;
revoke all on function public.system_health_install_schedule() from public, anon, authenticated;
revoke all on function public.system_health_remove_schedule() from public, anon, authenticated;
grant execute on function public.system_health_prepare_secrets(text) to service_role;
grant execute on function public.system_health_install_schedule() to service_role;
grant execute on function public.system_health_remove_schedule() to service_role;
