-- Keep the current handler when they start validation, for every service.
create or replace function public.clear_request_claim_on_stage_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'submitted'
      and new.status = 'under_validation'
      and old.claimed_by = auth.uid()
      and old.claimed_stage = old.status
      and old.claim_expires_at > now() then
      new.claimed_by := old.claimed_by;
      new.claimed_stage := new.status;
      new.claimed_at := old.claimed_at;
      new.claim_expires_at := old.claim_expires_at;
    else
      new.claimed_by := null;
      new.claimed_stage := null;
      new.claimed_at := null;
      new.claim_expires_at := null;
    end if;
  end if;
  return new;
end;
$$;
