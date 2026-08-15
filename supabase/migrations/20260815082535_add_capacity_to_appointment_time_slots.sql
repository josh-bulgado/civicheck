-- Per-slot daily capacity for the appointment booking page. Left nullable
-- and un-defaulted rather than hardcoding a plausible-looking number:
-- nobody has given us CCRO's real per-slot capacity, and a fabricated cap
-- (e.g. "20 people") would be actively misleading on a government service.
-- NULL means "no cap configured yet" — slots stay bookable without a
-- remaining-count badge until an admin sets a real value.
alter table public.appointment_time_slots
  add column if not exists capacity integer;
