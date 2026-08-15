-- Constrain requests.status to the CLAUDE.md §4 workflow vocabulary.
-- Every other status column in the schema has a check constraint; this one
-- was free text, so a typo in application code could silently strand a
-- request outside the pipeline.

alter table public.requests
  drop constraint if exists requests_status_check;

alter table public.requests
  add constraint requests_status_check
  check (status in (
    'pending_frontdesk',
    'under_validation',
    'incomplete',
    'rejected',
    'processing',
    'pending_approval',
    'ready_for_release',
    'released'
  ));

-- Staff pipeline reads filter by status and sort by recency.
create index if not exists requests_status_created_at_idx
  on public.requests (status, created_at desc);
