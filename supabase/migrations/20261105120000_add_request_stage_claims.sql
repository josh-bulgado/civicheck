-- Staff choose work from shared queues. A short stage lease prevents two people
-- from changing the same request without creating permanent assignments.
alter table public.requests
  add column if not exists claimed_by uuid references public.profiles(id),
  add column if not exists claimed_stage text,
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_expires_at timestamptz;

alter table public.requests
  drop constraint if exists requests_claim_complete_check;

alter table public.requests
  add constraint requests_claim_complete_check check (
    (claimed_by is null and claimed_stage is null and claimed_at is null and claim_expires_at is null)
    or
    (claimed_by is not null and claimed_stage = status and claimed_at is not null and claim_expires_at > claimed_at)
  );

create index if not exists requests_active_claim_idx
  on public.requests (claimed_by, claim_expires_at)
  where claimed_by is not null;

create or replace function public.clear_request_claim_on_stage_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.claimed_by := null;
    new.claimed_stage := null;
    new.claimed_at := null;
    new.claim_expires_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists clear_request_claim_on_stage_change on public.requests;
create trigger clear_request_claim_on_stage_change
  before update of status on public.requests
  for each row execute function public.clear_request_claim_on_stage_change();

comment on column public.requests.claimed_by is
  'Staff member temporarily handling the current workflow stage; not a permanent assignment.';
comment on column public.requests.claim_expires_at is
  'Lease expiry. Another staff member may claim the stage after this time.';
