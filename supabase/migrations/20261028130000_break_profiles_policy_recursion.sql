-- Since 20261027122000 every read of public.profiles has failed with "infinite
-- recursion detected in policy for relation profiles". Its personnel policy
-- looks into requests, the personnel request policies look into
-- services_registry, and this services_registry policy looked straight back
-- into profiles. Postgres expands every policy on a table whoever is asking, so
-- the loop broke applicants' reads of their own profile too: the app saw a
-- blank name and held every signed-in user at onboarding.
--
-- get_user_role() reads profiles as its owner, outside RLS, which ends the
-- loop. It answers only for an active profile, so the rule is unchanged: an
-- active System Administrator manages the registry.

alter policy "System administrators can manage services registry"
  on public.services_registry
  using ((select public.get_user_role()) = 'system_admin')
  with check ((select public.get_user_role()) = 'system_admin');
