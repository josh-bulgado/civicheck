-- "Don't show this again" on the applicant welcome tutorial must follow the
-- account, not the browser: once ticked it stays off on every device.
--
-- Users change it themselves through the existing "Users can update own
-- profile" policy. It grants nothing, so guard_profile_access_fields() is left
-- alone.

alter table public.profiles
  add column if not exists hide_welcome_tutorial boolean not null default false;

comment on column public.profiles.hide_welcome_tutorial is
  'Applicant ticked "Don''t show this again" on the welcome tutorial.';
