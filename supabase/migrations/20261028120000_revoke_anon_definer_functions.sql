-- Supabase exposes every function in `public` as /rest/v1/rpc/<name>, and
-- Postgres grants EXECUTE to PUBLIC by default, so SECURITY DEFINER routines
-- stay callable by `anon` unless that is revoked explicitly.
--
-- handle_new_user and rls_auto_enable are triggers (on auth.users and as an
-- event trigger). Triggers do not check EXECUTE when they fire, so nothing needs
-- to call them over the API. replace_ccro_admin checks for an active System
-- Administrator inside, but there is no reason to expose it to signed-out
-- callers. (auto_confirm_user was dropped in 20261027120000.)
--
-- get_user_role stays executable by anon: RLS policies call it while anon
-- evaluates them, and it answers null for a caller with no session.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

revoke all on function public.replace_ccro_admin(uuid, text, text) from public, anon;
grant execute on function public.replace_ccro_admin(uuid, text, text)
  to authenticated, service_role;
