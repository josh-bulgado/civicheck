-- requirements_attachments had INSERT + SELECT policies for applicants
-- (own request only) but no UPDATE policy at all — only "Personnel can
-- update permitted attachments" (staff/supervisor/admin). The public
-- /track resubmit flow worked around this with the service-role admin
-- client; the new in-app applicant detail page needs the same resubmit
-- action to work under the normal RLS-respecting session client, so add
-- the missing ownership-scoped UPDATE policy. Rejected-only is enforced in
-- the calling mutation, same as the ownership-only shape of the sibling
-- INSERT/SELECT policies below.
create policy "Applicants can resubmit own attachments" on public.requirements_attachments
  for update
  using (
    exists (
      select 1 from public.requests r
      where r.id = requirements_attachments.request_id
        and r.applicant_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.requests r
      where r.id = requirements_attachments.request_id
        and r.applicant_id = (select auth.uid())
    )
  );
