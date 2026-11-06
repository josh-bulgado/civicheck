-- Keep the staff docket small over the wire. The view exposes only list fields;
-- the function applies every filter before it pages, so counts and rows agree.

create or replace view public.request_queue_rows
with (security_invoker = true)
as
select
  r.id,
  r.tracking_number,
  r.status,
  r.payment_status,
  r.fees_due,
  r.applicant_id,
  r.created_at,
  r.updated_at,
  r.claimed_by,
  r.claimed_stage,
  r.claimed_at,
  r.claim_expires_at,
  s.department_id,
  coalesce(d.name, 'Unassigned') as department_name,
  coalesce(nullif(s.display_name, ''), nullif(s.name, ''), r.request_type, '—') as service_name,
  coalesce(
    nullif(trim(concat_ws(' ', applicant.first_name, applicant.last_name)), ''),
    nullif(trim(concat_ws(' ', r.form_data ->> 'subject_first_name', r.form_data ->> 'subject_last_name')), ''),
    '—'
  ) as applicant_name,
  coalesce(
    nullif(trim(concat_ws(' ', handler.first_name, handler.last_name)), ''),
    'Another staff member'
  ) as claim_staff_name,
  case
    when r.status in ('cancelled', 'released', 'rejected') then 'none'
    when r.status = 'incomplete' then 'applicant'
    when r.status = 'ready_for_release' and r.payment_status is distinct from 'verified' then 'payment'
    else 'staff'
  end as request_turn,
  case r.status
    when 'submitted' then 10
    when 'cancelled' then 17
    when 'under_validation' then 21
    when 'incomplete' then 22
    when 'rejected' then 23
    when 'processing' then 34
    when 'ready_for_release' then 45
    when 'released' then 46
    else 0
  end as status_rank,
  case r.status
    when 'submitted' then 1
    when 'cancelled' then 1
    when 'under_validation' then 2
    when 'incomplete' then 2
    when 'rejected' then 2
    when 'processing' then 3
    when 'ready_for_release' then 4
    when 'released' then 4
    else null
  end as workflow_stage,
  case
    when r.status not in ('ready_for_release', 'released') then 'none'
    when coalesce(r.fees_due, 0) <= 0 then 'no_fee'
    when r.payment_status = 'verified' then 'paid'
    else 'unpaid'
  end as payment_display,
  concat_ws(
    ' ',
    r.tracking_number,
    coalesce(s.display_name, s.name, r.request_type),
    coalesce(
      nullif(trim(concat_ws(' ', applicant.first_name, applicant.last_name)), ''),
      trim(concat_ws(' ', r.form_data ->> 'subject_first_name', r.form_data ->> 'subject_last_name'))
    )
  ) as search_text
from public.requests r
left join public.services_registry s on s.service_code = r.request_type
left join public.departments d on d.id = s.department_id
left join public.profiles applicant on applicant.id = r.applicant_id
left join public.profiles handler on handler.id = r.claimed_by;

revoke all on public.request_queue_rows from public, anon;
grant select on public.request_queue_rows to authenticated;

create or replace function public.get_request_queue_page(
  p_page integer default 0,
  p_page_size integer default 20,
  p_search text default null,
  p_stage integer default null,
  p_status text default null,
  p_payment text default null,
  p_department text default null,
  p_needs boolean default false,
  p_mine boolean default false,
  p_attention boolean default false,
  p_sort text default 'inStage',
  p_desc boolean default true,
  p_now timestamptz default statement_timestamp()
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with base as materialized (
    select *
    from public.request_queue_rows
    where public.is_active_user()
      and public.get_user_role()::text in ('staff', 'supervisor', 'admin')
  ),
  common as (
    select *
    from base
    where (nullif(trim(p_search), '') is null or search_text ilike '%' || trim(p_search) || '%')
      and (p_status is null or status = p_status)
      and (
        p_payment is null
        or (
          workflow_stage = 4
          and fees_due > 0
          and coalesce(payment_status = 'verified', false) = (p_payment = 'verified')
        )
      )
      and (
        p_department is null
        or (p_department = 'unassigned' and department_id is null)
        or department_id = p_department
      )
  ),
  stage_scope as (
    select *
    from common
    where (not p_needs or request_turn = 'staff')
      and (
        not p_mine
        or (
          claimed_by = auth.uid()
          and claimed_stage = status
          and claim_expires_at > p_now
        )
      )
      and (
        not p_attention
        or (request_turn = 'staff' and updated_at <= p_now - interval '3 days')
      )
  ),
  filtered as (
    select * from stage_scope where p_stage is null or workflow_stage = p_stage
  ),
  totals as (
    select count(*)::integer as total from filtered
  ),
  paging as (
    select
      least(greatest(p_page, 0), 100000, greatest(ceil(total::numeric / least(greatest(p_page_size, 1), 50))::integer - 1, 0)) as page,
      least(greatest(p_page_size, 1), 50) as page_size
    from totals
  ),
  page_rows as (
    select
      id, tracking_number, status, payment_status, fees_due, applicant_id,
      created_at, updated_at, claimed_by, claimed_stage, claimed_at,
      claim_expires_at, department_id, department_name, service_name,
      applicant_name, claim_staff_name
    from filtered, paging
    order by
      case when p_sort = 'trackingNumber' and not p_desc then tracking_number end asc,
      case when p_sort = 'trackingNumber' and p_desc then tracking_number end desc,
      case when p_sort = 'applicantName' and not p_desc then applicant_name end asc,
      case when p_sort = 'applicantName' and p_desc then applicant_name end desc,
      case when p_sort = 'serviceName' and not p_desc then service_name end asc,
      case when p_sort = 'serviceName' and p_desc then service_name end desc,
      case when p_sort = 'departmentName' and not p_desc then department_name end asc,
      case when p_sort = 'departmentName' and p_desc then department_name end desc,
      case when p_sort = 'status' and not p_desc then status_rank end asc,
      case when p_sort = 'status' and p_desc then status_rank end desc,
      case when p_sort = 'handler' and not p_desc then
        case when claimed_stage = status and claim_expires_at > p_now
          then case when claimed_by = auth.uid() then 'You' else claim_staff_name end
          else 'Available' end
      end asc,
      case when p_sort = 'handler' and p_desc then
        case when claimed_stage = status and claim_expires_at > p_now
          then case when claimed_by = auth.uid() then 'You' else claim_staff_name end
          else 'Available' end
      end desc,
      case when p_sort = 'payment' and not p_desc then payment_display end asc,
      case when p_sort = 'payment' and p_desc then payment_display end desc,
      case when p_sort = 'createdAt' and not p_desc then created_at end asc,
      case when p_sort = 'createdAt' and p_desc then created_at end desc,
      case when p_sort = 'inStage' and not p_desc then
        case request_turn when 'staff' then 2 when 'none' then 0 else 1 end
      end asc,
      case when p_sort = 'inStage' and p_desc then
        case request_turn when 'staff' then 2 when 'none' then 0 else 1 end
      end desc,
      case when p_sort = 'inStage' and not p_desc then updated_at end desc,
      case when p_sort = 'inStage' and p_desc then updated_at end asc,
      created_at desc,
      id asc
    limit (select page_size from paging)
    offset (select page * page_size from paging)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows), '[]'::jsonb),
    'total', (select total from totals),
    'page', (select page from paging),
    'pageSize', (select page_size from paging),
    'requestCount', (select count(*) from base),
    'waitingCount', (select count(*) from base where request_turn = 'staff'),
    'attentionCount', (
      select count(*) from common
      where (p_stage is null or workflow_stage = p_stage)
        and request_turn = 'staff'
        and updated_at <= p_now - interval '3 days'
    ),
    'stageCounts', jsonb_build_object(
      'all', (select count(*) from stage_scope),
      '1', (select count(*) from stage_scope where workflow_stage = 1),
      '2', (select count(*) from stage_scope where workflow_stage = 2),
      '3', (select count(*) from stage_scope where workflow_stage = 3),
      '4', (select count(*) from stage_scope where workflow_stage = 4)
    )
  );
$$;

revoke execute on function public.get_request_queue_page(integer, integer, text, integer, text, text, text, boolean, boolean, boolean, text, boolean, timestamptz) from public, anon;
grant execute on function public.get_request_queue_page(integer, integer, text, integer, text, text, text, boolean, boolean, boolean, text, boolean, timestamptz) to authenticated;

create index if not exists requests_created_at_id_idx
  on public.requests (created_at desc, id);

-- shortcut: substring name search scans visible rows; add trigram indexes only if measured latency warrants it.
