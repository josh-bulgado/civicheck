-- Runs inside begin; …; rollback; with 20261010120000 applied first.
-- Any failed assert aborts the whole run.

do $$
declare
  v_a uuid;
  v_b uuid;
  v_applicant uuid;
  v_req uuid;
begin
  select id into v_a from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active'
  order by id limit 1;
  select id into v_b from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and id <> v_a
  order by id limit 1;
  select id into v_applicant from public.profiles
  where role = 'applicant' and access_status = 'active' limit 1;
  assert v_a is not null and v_b is not null and v_applicant is not null,
    'fixture: need two active staff and one active applicant';

  insert into public.requests (tracking_number, applicant_id, request_type)
  select 'TEST-' || gen_random_uuid(), v_applicant, service_code
  from public.services_registry order by service_code limit 1
  returning id into v_req;

  insert into public.staff_notifications
    (recipient_id, request_id, tracking_number, type, title, body)
  values
    (v_a, v_req, 'TEST-A', 'new_request', 'for a', 'body a'),
    (v_b, v_req, 'TEST-B', 'new_request', 'for b', 'body b');

  perform set_config('t.a', v_a::text, true);
  perform set_config('t.b', v_b::text, true);
  perform set_config('t.req', v_req::text, true);
end $$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text,
  true
);

do $$
declare
  n int;
begin
  -- 1. A recipient sees only their own rows.
  select count(*) into n from public.staff_notifications;
  assert n = 1, format('recipient should see exactly 1 row, saw %s', n);

  -- 2. They can mark their own row read and archive it.
  update public.staff_notifications
  set is_read = true, read_at = now(), archived_at = now()
  where recipient_id = current_setting('t.a')::uuid;
  get diagnostics n = row_count;
  assert n = 1, 'recipient should be able to update read/archive state';

  -- 3. They cannot rewrite the content.
  begin
    update public.staff_notifications set title = 'tampered'
    where recipient_id = current_setting('t.a')::uuid;
    raise exception 'content update should have been denied';
  exception when insufficient_privilege then null;
  end;

  -- 4. They cannot insert (only triggers write).
  begin
    insert into public.staff_notifications
      (recipient_id, request_id, tracking_number, type, title, body)
    values (current_setting('t.a')::uuid, current_setting('t.req')::uuid,
            'TEST-X', 'new_request', 'x', 'x');
    raise exception 'insert should have been denied';
  exception when insufficient_privilege then null;
  end;

  -- 5. They cannot delete.
  begin
    delete from public.staff_notifications;
    raise exception 'delete should have been denied';
  exception when insufficient_privilege then null;
  end;

  -- 6. Another recipient's row is invisible and untouchable (0 rows, no error).
  update public.staff_notifications set is_read = true
  where recipient_id = current_setting('t.b')::uuid;
  get diagnostics n = row_count;
  assert n = 0, 'must not be able to touch another recipient''s row';
end $$;

reset role;

-- 7. Realtime publication includes the table.
do $$
begin
  assert exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'staff_notifications'
  ), 'staff_notifications must be in the supabase_realtime publication';
end $$;
