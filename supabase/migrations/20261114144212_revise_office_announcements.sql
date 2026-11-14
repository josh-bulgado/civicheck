-- Keep existing content while separating publication, relevance and priority.
alter table public.office_advisories rename column importance to priority;
drop trigger stamp_office_advisories on public.office_advisories;
alter table public.office_advisories drop constraint office_advisories_importance_check;
update public.office_advisories set priority = 'standard' where priority = 'routine';
alter table public.office_advisories alter column priority set default 'standard';
alter table public.office_advisories add constraint office_advisories_priority_check check (priority in ('important','standard'));
alter table public.office_advisories
  add column show_on text not null default 'both' check (show_on in ('landing','portal','both')),
  add column all_services boolean not null default true,
  add column affected_starts_on date,
  add column affected_ends_on date,
  add column details text not null default '' check (char_length(details) <= 6000),
  add column action_label text not null default '' check (char_length(action_label) <= 60),
  add column action_url text not null default '' check (char_length(action_url) <= 500),
  add constraint office_advisories_affected_dates_check check (
    (affected_ends_on is null or (affected_starts_on is not null and affected_ends_on >= affected_starts_on))
    and (affected_starts_on is null or affected_starts_on between date '1900-01-01' and date '9999-12-31')
    and (affected_ends_on is null or affected_ends_on between date '1900-01-01' and date '9999-12-31')
  ),
  add constraint office_advisories_action_check check (
    (action_label = '' and action_url = '') or (
      char_length(btrim(action_label)) > 0 and action_url !~ '[[:space:]\\]'
      and (action_url ~ '^/(requirements|services|track)([?][^#]*)?$'
        or action_url ~* '^https://[^/@\\[:space:]]+([/?#][^\\[:space:]]*)?$')
    )
  );
update public.office_advisories set details = message, message = left(message, 297) || '…' where char_length(message) > 300;
alter table public.office_advisories drop constraint office_advisories_message_check;
alter table public.office_advisories add constraint office_advisories_message_check check (char_length(btrim(message)) between 1 and 300);

grant select(show_on,all_services,affected_starts_on,affected_ends_on,details,action_label,action_url)
  on public.office_advisories to anon,authenticated;
grant insert(show_on,all_services,affected_starts_on,affected_ends_on,details,action_label,action_url),
  update(show_on,all_services,affected_starts_on,affected_ends_on,details,action_label,action_url)
  on public.office_advisories to authenticated;

drop policy "Public readers see currently published notices" on public.office_advisories;
create policy "Public readers see current landing announcements" on public.office_advisories
for select to anon,authenticated using (
  publication_status = 'published' and show_on in ('landing','both')
  and starts_on <= (current_timestamp at time zone 'Asia/Manila')::date
  and ends_on >= (current_timestamp at time zone 'Asia/Manila')::date
);
create policy "Active operational accounts see current portal announcements" on public.office_advisories
for select to authenticated using (
  (select public.is_active_user()) and (select public.get_user_role()) in ('applicant','staff','supervisor','cashier','admin')
  and publication_status = 'published' and show_on in ('portal','both')
  and starts_on <= (current_timestamp at time zone 'Asia/Manila')::date
  and ends_on >= (current_timestamp at time zone 'Asia/Manila')::date
);

create table public.office_advisory_services (
  advisory_id uuid not null references public.office_advisories(id) on delete cascade,
  service_code text not null references public.services_registry(service_code) on delete restrict,
  primary key (advisory_id,service_code)
);
create index office_advisory_services_service_idx on public.office_advisory_services(service_code);
alter table public.office_advisory_services enable row level security;
revoke all on public.office_advisory_services from public,anon,authenticated;
grant select on public.office_advisory_services to anon,authenticated;
grant insert,delete on public.office_advisory_services to authenticated;
grant all on public.office_advisory_services to service_role;
create policy "Read service targets of visible announcements" on public.office_advisory_services
for select to anon,authenticated using (exists (select 1 from public.office_advisories a where a.id = advisory_id));
create policy "Admins add announcement targets" on public.office_advisory_services
for insert to authenticated with check ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');
create policy "Admins remove announcement targets" on public.office_advisory_services
for delete to authenticated using ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');

-- Defer the cross-table invariant until the atomic content/target save finishes.
create function public.check_office_advisory_targets() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare target_id uuid; all_selected boolean; has_targets boolean;
begin
  if tg_table_name = 'office_advisories' then target_id := new.id;
  elsif tg_op = 'DELETE' then target_id := old.advisory_id;
  else target_id := new.advisory_id; end if;
  select a.all_services into all_selected from public.office_advisories a where a.id=target_id;
  if not found then return null; end if;
  select exists(select 1 from public.office_advisory_services s where s.advisory_id=target_id) into has_targets;
  if all_selected = has_targets then
    raise exception 'Choose All services with no selected targets, or select at least one affected service.' using errcode='23514';
  end if;
  return null;
end; $$;
revoke all on function public.check_office_advisory_targets() from public,anon,authenticated;
create constraint trigger check_advisory_targets after insert or update on public.office_advisories
deferrable initially deferred for each row execute function public.check_office_advisory_targets();
create constraint trigger check_advisory_service_targets after insert or delete on public.office_advisory_services
deferrable initially deferred for each row execute function public.check_office_advisory_targets();

create trigger stamp_office_advisories before insert or update of title,message,priority,starts_on,ends_on,publication_status,show_on,all_services,affected_starts_on,affected_ends_on,details,action_label,action_url on public.office_advisories
for each row execute function public.stamp_office_configuration();

create function public.save_office_advisory(p_values jsonb,p_service_codes text[] default '{}',p_id uuid default null,p_expected_updated_at timestamptz default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare saved_id uuid;
begin
  if not public.is_active_user() or public.get_user_role() is distinct from 'admin' then
    raise exception 'Only active CCRO administrators can manage announcements.' using errcode='42501';
  end if;
  if cardinality(p_service_codes)>100 then raise exception 'Too many selected services.' using errcode='23514'; end if;
  if p_id is null then
    insert into public.office_advisories(title,message,priority,starts_on,ends_on,publication_status,show_on,all_services,affected_starts_on,affected_ends_on,details,action_label,action_url)
    values(p_values->>'title',p_values->>'message',p_values->>'priority',(p_values->>'starts_on')::date,(p_values->>'ends_on')::date,p_values->>'publication_status',p_values->>'show_on',(p_values->>'all_services')::boolean,(p_values->>'affected_starts_on')::date,(p_values->>'affected_ends_on')::date,p_values->>'details',p_values->>'action_label',p_values->>'action_url') returning id into saved_id;
  else
    update public.office_advisories set title=p_values->>'title',message=p_values->>'message',priority=p_values->>'priority',starts_on=(p_values->>'starts_on')::date,ends_on=(p_values->>'ends_on')::date,publication_status=p_values->>'publication_status',show_on=p_values->>'show_on',all_services=(p_values->>'all_services')::boolean,affected_starts_on=(p_values->>'affected_starts_on')::date,affected_ends_on=(p_values->>'affected_ends_on')::date,details=p_values->>'details',action_label=p_values->>'action_label',action_url=p_values->>'action_url'
    where id=p_id and updated_at=p_expected_updated_at returning id into saved_id;
    if saved_id is null then raise exception 'This announcement changed while you were editing. Refresh and review it.' using errcode='40001'; end if;
    delete from public.office_advisory_services where advisory_id=saved_id;
  end if;
  insert into public.office_advisory_services(advisory_id,service_code) select saved_id,code from (select distinct unnest(p_service_codes) as code) s;
  return saved_id;
end; $$;
revoke all on function public.save_office_advisory(jsonb,text[],uuid,timestamptz) from public,anon;
grant execute on function public.save_office_advisory(jsonb,text[],uuid,timestamptz) to authenticated,service_role;

create table public.office_advisory_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  advisory_id uuid not null references public.office_advisories(id) on delete cascade,
  advisory_updated_at timestamptz not null,
  primary key(user_id,advisory_id)
);
create index office_advisory_dismissals_advisory_idx on public.office_advisory_dismissals(advisory_id);
alter table public.office_advisory_dismissals enable row level security;
revoke all on public.office_advisory_dismissals from public,anon,authenticated;
grant select,insert,update,delete on public.office_advisory_dismissals to authenticated;
grant all on public.office_advisory_dismissals to service_role;
create policy "Citizens read their own announcement dismissals" on public.office_advisory_dismissals
for select to authenticated using ((select public.is_active_user()) and (select public.get_user_role())='applicant' and user_id=(select auth.uid()));
create policy "Citizens dismiss current standard portal announcements" on public.office_advisory_dismissals
for insert to authenticated with check (
  (select public.is_active_user()) and (select public.get_user_role())='applicant' and user_id=(select auth.uid())
  and exists(select 1 from public.office_advisories a where a.id=advisory_id and a.priority='standard' and a.show_on in ('portal','both') and a.publication_status='published' and a.updated_at=advisory_updated_at
    and a.starts_on <= (current_timestamp at time zone 'Asia/Manila')::date and a.ends_on >= (current_timestamp at time zone 'Asia/Manila')::date)
);
create policy "Citizens update only their own current standard dismissal" on public.office_advisory_dismissals
for update to authenticated using ((select public.is_active_user()) and (select public.get_user_role())='applicant' and user_id=(select auth.uid()))
with check (
  (select public.is_active_user()) and (select public.get_user_role())='applicant' and user_id=(select auth.uid())
  and exists(select 1 from public.office_advisories a where a.id=advisory_id and a.priority='standard' and a.show_on in ('portal','both') and a.publication_status='published' and a.updated_at=advisory_updated_at
    and a.starts_on <= (current_timestamp at time zone 'Asia/Manila')::date and a.ends_on >= (current_timestamp at time zone 'Asia/Manila')::date)
);
create policy "Citizens restore their own announcement visibility" on public.office_advisory_dismissals
for delete to authenticated using ((select public.is_active_user()) and (select public.get_user_role())='applicant' and user_id=(select auth.uid()));
