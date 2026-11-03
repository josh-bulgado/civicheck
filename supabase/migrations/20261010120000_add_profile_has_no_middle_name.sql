-- A NULL middle_name on its own can't tell "this person has no middle name"
-- apart from "never filled in" (Google sign-ins, older accounts). Signup now
-- asks the applicant to either enter a middle name or tick "I don't have a
-- middle name", and this flag records that explicit answer.
--
-- Invariant kept by the app: has_no_middle_name = true  =>  middle_name is NULL.

alter table public.profiles
  add column if not exists has_no_middle_name boolean not null default false;

comment on column public.profiles.has_no_middle_name is
  'The account holder confirmed they have no middle name. Distinguishes a deliberate blank from a middle_name that was never provided.';
