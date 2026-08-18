-- Supabase's default privileges grant EXECUTE on new public-schema functions
-- to anon/authenticated/service_role directly (not via the PUBLIC
-- pseudo-role), so `revoke all ... from public` in the previous migration
-- didn't actually stop anon from calling this over PostgREST. The function
-- body already guards on get_user_role(), but there's no reason to leave an
-- unauthenticated caller able to invoke it at all.
revoke execute on function public.get_applicant_email(uuid) from anon;
