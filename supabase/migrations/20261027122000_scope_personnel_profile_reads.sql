-- Personnel could read every profile in the system: every citizen's name, date
-- of birth, sex and phone number, whether or not they had ever filed anything
-- with that person's department. What personnel actually read through their own
-- session is the applicant on a request they handle and the names of colleagues
-- on logs and messages, so that is now all they can see.
--
-- The requests subquery runs under the caller's own request policies, so staff
-- and supervisors see the applicants of their department's requests, and the
-- cashier and CCRO Administrator those of every request. Account management
-- reads profiles with the service role and is not affected.

drop policy if exists "Staff and admin can view all profiles" on public.profiles;
drop policy if exists "Personnel can view profiles they work with" on public.profiles;
create policy "Personnel can view profiles they work with"
  on public.profiles
  for select
  to authenticated
  using (
    (select public.get_user_role()) = any (array['admin', 'staff', 'supervisor', 'cashier'])
    and (
      role::text <> 'applicant'
      or exists (select 1 from public.requests r where r.applicant_id = profiles.id)
    )
  );
