-- Supabase Auth answers every rejected email code with the same "Token has
-- expired or is invalid", so the code-entry screen couldn't tell an applicant
-- who mistyped apart from one who typed a code a Resend had already replaced.
--
-- The server keeps a keyed hash of each code it emails here, so a rejected
-- code can be matched against what was sent before. Keyed by email rather
-- than user id because an unconfirmed signup is deleted and recreated on
-- every resend. Only the service role touches it: RLS is on with no policies.

create table if not exists public.auth_otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('signup', 'recovery')),
  code_hash text not null,
  issued_at timestamptz not null default now()
);

create index if not exists auth_otp_codes_email_purpose_idx
  on public.auth_otp_codes (email, purpose, issued_at desc);

alter table public.auth_otp_codes enable row level security;
revoke all on table public.auth_otp_codes from public, anon, authenticated;
grant select, insert, delete on table public.auth_otp_codes to service_role;

comment on table public.auth_otp_codes is
  'Keyed hashes of emailed signup/recovery codes, used only to explain why a code was rejected.';
