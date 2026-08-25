-- The on_auth_user_created trigger + handle_new_user() function previously only
-- existed hand-applied on the live project (not tracked in any migration). This
-- migration brings it under version control and fixes it: it only ever read
-- raw_user_meta_data->>'first_name' / 'last_name', which our own email/password
-- signup sets, but Google OAuth never does (Google supplies given_name/family_name
-- and full_name/name instead) -- so every Google sign-in got a blank-name profile.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
  full_name text := coalesce(meta ->> 'full_name', meta ->> 'name', '');
  first_word text := nullif(split_part(full_name, ' ', 1), '');
  rest_words text := nullif(
    trim(substring(full_name from length(coalesce(first_word, '')) + 1)),
    ''
  );
begin
  insert into public.profiles (id, first_name, last_name)
  values (
    new.id,
    coalesce(
      nullif(meta ->> 'first_name', ''),
      nullif(meta ->> 'given_name', ''),
      first_word,
      ''
    ),
    coalesce(
      nullif(meta ->> 'last_name', ''),
      nullif(meta ->> 'family_name', ''),
      rest_words,
      ''
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill accounts that already ended up with a blank name (e.g. existing Google
-- sign-ins). Only touches rows still missing a name, and never overwrites a
-- column that already has one.
update public.profiles p
set
  first_name = coalesce(
    nullif(p.first_name, ''),
    nullif(u.raw_user_meta_data ->> 'given_name', ''),
    nullif(
      split_part(
        coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
        ' ',
        1
      ),
      ''
    ),
    p.first_name
  ),
  last_name = coalesce(
    nullif(p.last_name, ''),
    nullif(u.raw_user_meta_data ->> 'family_name', ''),
    nullif(
      trim(
        substring(
          coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')
          from length(
            split_part(
              coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''),
              ' ',
              1
            )
          ) + 1
        )
      ),
      ''
    ),
    p.last_name
  ),
  updated_at = now()
from auth.users u
where p.id = u.id
  and (p.first_name = '' or p.last_name = '');
