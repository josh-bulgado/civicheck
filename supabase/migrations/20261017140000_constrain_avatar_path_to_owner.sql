-- profiles.avatar_path must point into the owner's own folder of the avatars
-- bucket. The "Users can update own profile" policy lets people write their own
-- row directly, so without this a user could set avatar_path to someone else's
-- object path. Storage RLS would refuse to sign it, but a cached signed link for
-- that path could still be handed out. The server function already builds
-- `<user id>/<file>`; this makes the database refuse anything else.

alter table public.profiles
  drop constraint if exists profiles_avatar_path_owner;
alter table public.profiles
  add constraint profiles_avatar_path_owner check (
    avatar_path is null
    or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9_-]+\.(jpg|png|webp)$')
  );
