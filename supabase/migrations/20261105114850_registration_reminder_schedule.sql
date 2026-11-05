create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep the scheduled sender's credentials in Vault, never in source or cron text.
create function public.configure_registration_reminder_email(p_api_key text, p_from text, p_reply_to text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_name text; v_value text; v_id uuid;
begin
  if coalesce(p_api_key,'')='' or coalesce(p_from,'')='' then raise exception 'Email credentials are required'; end if;
  for v_name,v_value in select * from (values
    ('registration_reminder_email_key',p_api_key),
    ('registration_reminder_email_from',p_from),
    ('registration_reminder_email_reply_to',coalesce(p_reply_to,''))
  ) v(name,value) loop
    select id into v_id from vault.secrets where name=v_name;
    if v_id is null then perform vault.create_secret(v_value,v_name);
    else perform vault.update_secret(v_id,v_value); end if;
  end loop;
end;
$$;
create function public.registration_reminder_email_config() returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_object_agg(replace(name,'registration_reminder_email_',''),decrypted_secret)
  from vault.decrypted_secrets where name in (
    'registration_reminder_email_key','registration_reminder_email_from','registration_reminder_email_reply_to'
  );
$$;
revoke all on function public.configure_registration_reminder_email(text,text,text) from public, anon, authenticated;
revoke all on function public.registration_reminder_email_config() from public, anon, authenticated;
grant execute on function public.configure_registration_reminder_email(text,text,text) to service_role;
grant execute on function public.registration_reminder_email_config() to service_role;

do $$ begin
  if not exists (select 1 from vault.secrets where name='registration_reminder_secret') then
    perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''), 'registration_reminder_secret');
  end if;
end $$;

create function public.authorize_registration_reminder_worker(p_secret text) returns boolean
language sql security definer set search_path = '' as $$
  select coalesce(p_secret <> '' and p_secret = (
    select decrypted_secret from vault.decrypted_secrets where name='registration_reminder_secret'
  ),false);
$$;
revoke all on function public.authorize_registration_reminder_worker(text) from public, anon, authenticated;
grant execute on function public.authorize_registration_reminder_worker(text) to service_role;

create function public.registration_reminder_deliverable(p_notification_id uuid) returns boolean
language sql security definer set search_path = '' as $$
  select exists (
    select 1 from public.registration_reminders m join public.requests q on q.id=m.request_id
      join public.notifications n on n.id=m.notification_id
    where m.notification_id=p_notification_id and n.status <> 'sent'
      and q.hard_copies_validated_at is null
      and q.status in ('submitted','under_validation','incomplete','processing','ready_for_release')
      and m.deadline=public.registration_deadline(q.request_type,q.form_data)
      and m.deadline-(now() at time zone 'Asia/Manila')::date=m.days_left
  );
$$;
revoke all on function public.registration_reminder_deliverable(uuid) from public, anon, authenticated;
grant execute on function public.registration_reminder_deliverable(uuid) to service_role;

-- Install only after the worker and its email secrets are ready.
create function public.install_registration_reminder_schedule(p_function_url text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_function_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/registration-reminders$' then
    raise exception 'Expected the registration-reminders Edge Function URL';
  end if;
  if exists (select 1 from vault.secrets where name='registration_reminder_url') then
    perform vault.update_secret((select id from vault.secrets where name='registration_reminder_url'),p_function_url);
  else
    perform vault.create_secret(p_function_url,'registration_reminder_url');
  end if;
  perform cron.unschedule(jobname) from cron.job where jobname='registration-deadline-reminders';
  -- Check regularly so an applicant submitting later in the day is not missed.
  perform cron.schedule('registration-deadline-reminders','*/15 * * * *',$job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='registration_reminder_url'),
      headers := jsonb_build_object('Content-Type','application/json', 'x-reminder-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='registration_reminder_secret')),
      body := '{}'::jsonb, timeout_milliseconds := 60000
    );
  $job$);
end;
$$;
revoke all on function public.install_registration_reminder_schedule(text) from public, anon, authenticated;
grant execute on function public.install_registration_reminder_schedule(text) to service_role;
