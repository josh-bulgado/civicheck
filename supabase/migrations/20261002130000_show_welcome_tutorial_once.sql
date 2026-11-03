-- The welcome tutorial now opens automatically one time only, so the flag
-- records that it has been shown rather than a "Don't show this again" tick.
-- Applicants can still reopen it any time from "How it works".

alter table public.profiles
  rename column hide_welcome_tutorial to welcome_tutorial_seen;

comment on column public.profiles.welcome_tutorial_seen is
  'The welcome tutorial has opened automatically for this applicant. It never opens on its own again.';
