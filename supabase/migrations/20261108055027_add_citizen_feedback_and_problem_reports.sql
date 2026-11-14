-- Independent Civicheck feedback, separate from request workflow and payment.
create table public.request_feedback (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  ease_rating smallint check (ease_rating between 1 and 5),
  topics text[] not null default '{}' check (
    topics <@ array['application_form','requirements','uploads','status_updates','notifications','other']::text[]
    and cardinality(topics) <= 6
  ),
  comment text not null default '' check (char_length(comment) <= 2000),
  review_status text not null default 'new' check (review_status in ('new','reviewed','needs_action')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.problem_reports (
  id uuid primary key default gen_random_uuid(),
  reference_number bigint generated always as identity unique,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.requests(id) on delete set null,
  category text not null check (category in ('application_form','uploads','request_tracking','notifications','other')),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  page_path text not null default '' check (
    char_length(page_path) <= 500 and (page_path = '' or page_path ~ '^/[^?#]*$')
  ),
  review_status text not null default 'new' check (review_status in ('new','under_review','resolved')),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index request_feedback_applicant_idx on public.request_feedback(applicant_id);
create index request_feedback_created_idx on public.request_feedback(created_at desc, id);
create index request_feedback_reviewer_idx on public.request_feedback(reviewed_by) where reviewed_by is not null;
create index problem_reports_applicant_created_idx on public.problem_reports(applicant_id, created_at desc);
create index problem_reports_created_idx on public.problem_reports(created_at desc, id);
create index problem_reports_request_idx on public.problem_reports(request_id) where request_id is not null;
create index problem_reports_reviewer_idx on public.problem_reports(reviewed_by) where reviewed_by is not null;

alter table public.request_feedback enable row level security;
alter table public.problem_reports enable row level security;
revoke all on public.request_feedback, public.problem_reports from anon, authenticated;
grant select on public.request_feedback, public.problem_reports to authenticated;
grant insert(request_id, applicant_id, rating, ease_rating, topics, comment) on public.request_feedback to authenticated;
grant insert(applicant_id, request_id, category, description, page_path) on public.problem_reports to authenticated;
grant update(review_status) on public.request_feedback, public.problem_reports to authenticated;
grant usage on sequence public.problem_reports_reference_number_seq to authenticated, service_role;
grant all on public.request_feedback, public.problem_reports to service_role;

create policy "Applicants and admins read feedback" on public.request_feedback
for select to authenticated using (
  (select public.is_active_user()) and (
    ((select public.get_user_role()) = 'applicant' and applicant_id = (select auth.uid()))
    or (select public.get_user_role()) = 'admin'
  )
);
create policy "Applicants submit feedback on their released request" on public.request_feedback
for insert to authenticated with check (
  (select public.is_active_user()) and (select public.get_user_role()) = 'applicant'
  and applicant_id = (select auth.uid())
  and exists (select 1 from public.requests r where r.id = request_id
    and r.applicant_id = (select auth.uid()) and r.status = 'released')
);
create policy "Admins review feedback" on public.request_feedback
for update to authenticated
using ((select public.is_active_user()) and (select public.get_user_role()) = 'admin')
with check ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');

create policy "Applicants and admins read problem reports" on public.problem_reports
for select to authenticated using (
  (select public.is_active_user()) and (
    ((select public.get_user_role()) = 'applicant' and applicant_id = (select auth.uid()))
    or (select public.get_user_role()) = 'admin'
  )
);
create policy "Applicants report problems with their own context" on public.problem_reports
for insert to authenticated with check (
  (select public.is_active_user()) and (select public.get_user_role()) = 'applicant'
  and applicant_id = (select auth.uid())
  and (request_id is null or exists (select 1 from public.requests r
    where r.id = request_id and r.applicant_id = (select auth.uid())))
);
create policy "Admins review problem reports" on public.problem_reports
for update to authenticated
using ((select public.is_active_user()) and (select public.get_user_role()) = 'admin')
with check ((select public.is_active_user()) and (select public.get_user_role()) = 'admin');

-- Column grants keep original submissions immutable. Review metadata is stamped
-- by the database rather than accepted from a client.
create function public.stamp_citizen_submission_review() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.review_status is distinct from old.review_status then
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
  end if;
  return new;
end;
$$;
revoke all on function public.stamp_citizen_submission_review() from public, anon, authenticated;
create trigger stamp_feedback_review before update on public.request_feedback
for each row execute function public.stamp_citizen_submission_review();
create trigger stamp_problem_review before update on public.problem_reports
for each row execute function public.stamp_citizen_submission_review();

-- Enforced for direct Data API calls too; concurrent reports share one lock.
create function public.limit_citizen_problem_reports() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.applicant_id::text, 816));
  if (select count(*) from public.problem_reports p where p.applicant_id = new.applicant_id
    and p.created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'You have submitted several reports. Please wait 10 minutes before trying again.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.limit_citizen_problem_reports() from public, anon, authenticated;
create trigger limit_problem_reports before insert on public.problem_reports
for each row execute function public.limit_citizen_problem_reports();

-- Aggregate the entire filtered set, independent of the paginated review list.
create function public.citizen_feedback_summary(
  p_from timestamptz default null, p_until timestamptz default null, p_service text default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
begin
  if not public.is_active_user() or public.get_user_role() is distinct from 'admin' then
    raise exception 'Only an active administrator can read feedback summaries.' using errcode = '42501';
  end if;
  return (select jsonb_build_object(
    'total', count(*), 'satisfied', count(*) filter (where f.rating >= 4),
    'distribution', jsonb_build_array(
      count(*) filter (where f.rating = 1), count(*) filter (where f.rating = 2),
      count(*) filter (where f.rating = 3), count(*) filter (where f.rating = 4),
      count(*) filter (where f.rating = 5)))
    from public.request_feedback f join public.requests r on r.id = f.request_id
    where (p_from is null or f.created_at >= p_from)
      and (p_until is null or f.created_at < p_until)
      and (p_service is null or r.request_type = p_service));
end;
$$;
revoke all on function public.citizen_feedback_summary(timestamptz,timestamptz,text) from public, anon;
grant execute on function public.citizen_feedback_summary(timestamptz,timestamptz,text) to authenticated, service_role;
