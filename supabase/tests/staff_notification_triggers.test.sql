-- Runs inside begin; …; rollback; with both migrations applied.
-- Fixtures are derived from live data so no accounts are created.

create function pg_temp.new_request(p_service text, p_fee numeric)
returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into public.requests (tracking_number, applicant_id, request_type, status, fees_due)
  -- A conforming number (year 2099 cannot collide with a real one): the fan-out
  -- deliberately drops anything that is not CCRO-YYYY-NNNNNN.
  values ('CCRO-2099-' || lpad((floor(random() * 1000000))::int::text, 6, '0'),
          current_setting('t.applicant')::uuid, p_service, 'submitted', p_fee)
  returning id into v;
  return v;
end $$;

create function pg_temp.n(p_req uuid, p_type text) returns int
language sql as $$
  select count(*)::int from public.staff_notifications
  where request_id = p_req and type = p_type
$$;

do $$
declare
  v_dept text; v_service text; v_applicant uuid; v_a uuid; v_b uuid;
begin
  select department_id into v_dept from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and department_id is not null
  group by department_id having count(*) >= 2
  order by count(*) desc limit 1;
  assert v_dept is not null, 'fixture: need a department with >= 2 active staff/supervisors';

  select service_code into v_service from public.services_registry
  where department_id = v_dept order by service_code limit 1;
  assert v_service is not null, 'fixture: department has no service';

  select id into v_applicant from public.profiles
  where role = 'applicant' and access_status = 'active' limit 1;
  assert v_applicant is not null, 'fixture: need an active applicant';

  select id into v_a from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and department_id = v_dept
  order by id limit 1;
  select id into v_b from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active' and department_id = v_dept and id <> v_a
  order by id limit 1;

  perform set_config('t.dept', v_dept, true);
  perform set_config('t.service', v_service, true);
  perform set_config('t.applicant', v_applicant::text, true);
  perform set_config('t.a', v_a::text, true);
  perform set_config('t.b', v_b::text, true);
  perform set_config('t.cashier',
    (select id::text from public.profiles
     where role = 'cashier' and access_status = 'active' order by id limit 1), true);
end $$;

-- T1: new_request reaches exactly the active staff/supervisors of the department.
do $$
declare v uuid; expected int; got int; tracking text;
begin
  v := pg_temp.new_request(current_setting('t.service'), 150);
  perform set_config('t.req', v::text, true);

  select count(*) into expected from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active'
    and department_id = current_setting('t.dept');
  got := pg_temp.n(v, 'new_request');
  assert got = expected, format('T1 new_request rows: expected %s got %s', expected, got);

  assert not exists (
    select 1 from public.staff_notifications n
    join public.profiles p on p.id = n.recipient_id
    where n.request_id = v
      and (p.access_status <> 'active'
           or p.department_id is distinct from current_setting('t.dept')
           or p.role not in ('staff', 'supervisor'))
  ), 'T1 notified someone inactive / outside the department / wrong role';

  select tracking_number into tracking from public.requests where id = v;
  assert not exists (
    select 1 from public.staff_notifications
    where request_id = v and (title not like '%' || tracking || '%' or tracking_number <> tracking)
  ), 'T1 title and tracking_number must carry the tracking number';
end $$;

-- T2: the actor is never notified of their own action.
do $$
declare v uuid;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);
  v := pg_temp.new_request(current_setting('t.service'), 0);
  perform set_config('request.jwt.claims', '', true);

  assert not exists (
    select 1 from public.staff_notifications
    where request_id = v and recipient_id = current_setting('t.a')::uuid
  ), 'T2 actor was notified of their own action';
  assert exists (
    select 1 from public.staff_notifications
    where request_id = v and recipient_id = current_setting('t.b')::uuid
  ), 'T2 peer in the same department should have been notified';
end $$;

-- T3: writes that are not transitions notify nobody.
do $$
declare v uuid := current_setting('t.req')::uuid; before_n int; after_n int;
begin
  select count(*) into before_n from public.staff_notifications;
  update public.requests set updated_at = now() where id = v;
  update public.requests set status = status where id = v;
  update public.requests set payment_status = payment_status where id = v;
  select count(*) into after_n from public.staff_notifications;
  assert before_n = after_n, format('T3 non-transition updates created %s rows', after_n - before_n);
end $$;

-- T4: ready_for_release with a fee -> every active cashier, payment wording.
do $$
declare v uuid := current_setting('t.req')::uuid; cashiers int;
begin
  select count(*) into cashiers from public.profiles
  where role = 'cashier' and access_status = 'active';
  assert cashiers > 0, 'fixture: need an active cashier';

  update public.requests set status = 'ready_for_release' where id = v;

  assert pg_temp.n(v, 'awaiting_cashier') = cashiers,
    format('T4 awaiting_cashier rows: expected %s got %s', cashiers, pg_temp.n(v, 'awaiting_cashier'));
  assert not exists (
    select 1 from public.staff_notifications n join public.profiles p on p.id = n.recipient_id
    where n.request_id = v and n.type = 'awaiting_cashier' and p.role <> 'cashier'
  ), 'T4 awaiting_cashier reached a non-cashier';
  assert exists (
    select 1 from public.staff_notifications
    where request_id = v and type = 'awaiting_cashier' and title like '%payment verification%'
  ), 'T4 fee request should say "payment verification"';
end $$;

-- T5: ready_for_release with no fee still goes to the cashier, fee-free wording.
do $$
declare v uuid;
begin
  v := pg_temp.new_request(current_setting('t.service'), 0);
  update public.requests set status = 'ready_for_release' where id = v;
  assert exists (
    select 1 from public.staff_notifications
    where request_id = v and type = 'awaiting_cashier' and title like '%fee-free confirmation%'
  ), 'T5 fee-free request should say "fee-free confirmation"';
end $$;

-- T6: payment verified -> every active admin, not cashiers.
do $$
declare v uuid := current_setting('t.req')::uuid; admins int;
begin
  select count(*) into admins from public.profiles
  where role = 'admin' and access_status = 'active';
  assert admins > 0, 'fixture: need an active admin';

  update public.requests set payment_status = 'verified', or_number = 'TEST-OR-' || gen_random_uuid()
  where id = v;

  assert pg_temp.n(v, 'ready_to_release') = admins,
    format('T6 ready_to_release rows: expected %s got %s', admins, pg_temp.n(v, 'ready_to_release'));
  assert not exists (
    select 1 from public.staff_notifications n join public.profiles p on p.id = n.recipient_id
    where n.request_id = v and n.type = 'ready_to_release' and p.role <> 'admin'
  ), 'T6 ready_to_release reached a non-admin';
end $$;

-- T7: re-entering ready_for_release is a new event and notifies again.
do $$
declare v uuid := current_setting('t.req')::uuid; cashiers int; before_n int;
begin
  select count(*) into cashiers from public.profiles where role = 'cashier' and access_status = 'active';
  before_n := pg_temp.n(v, 'awaiting_cashier');
  update public.requests set status = 'processing' where id = v;
  update public.requests set status = 'ready_for_release' where id = v;
  assert pg_temp.n(v, 'awaiting_cashier') = before_n + cashiers, 'T7 re-entry should notify cashiers again';
end $$;

-- T8: incomplete and rejected go to admins with their own types.
do $$
declare v uuid; admins int;
begin
  select count(*) into admins from public.profiles where role = 'admin' and access_status = 'active';
  v := pg_temp.new_request(current_setting('t.service'), 0);
  update public.requests set status = 'incomplete' where id = v;
  assert pg_temp.n(v, 'request_incomplete') = admins, 'T8 incomplete should notify each admin';
  update public.requests set status = 'rejected' where id = v;
  assert pg_temp.n(v, 'request_rejected') = admins, 'T8 rejected should notify each admin';
end $$;

-- T9: the legacy single update (released + verified together) must not alert admins.
do $$
declare v uuid;
begin
  v := pg_temp.new_request(current_setting('t.service'), 0);
  update public.requests set status = 'ready_for_release' where id = v;
  update public.requests set status = 'released', payment_status = 'verified' where id = v;
  assert pg_temp.n(v, 'ready_to_release') = 0, 'T9 released+verified must not create ready_to_release';
end $$;

-- T10: only a rejected -> pending resubmission notifies department staff.
do $$
declare v uuid := current_setting('t.req')::uuid; expected int; a uuid;
begin
  select count(*) into expected from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active'
    and department_id = current_setting('t.dept');

  insert into public.requirements_attachments (request_id, requirement_name, file_url, verification_status)
  values (v, 'TEST requirement', 'test/path.pdf', 'rejected')
  returning id into a;
  assert pg_temp.n(v, 'document_resubmitted') = 0, 'T10 inserting a rejected doc must not notify';

  update public.requirements_attachments set verification_status = 'pending' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') = expected,
    format('T10 resubmission rows: expected %s got %s', expected, pg_temp.n(v, 'document_resubmitted'));

  update public.requirements_attachments set verification_status = 'approved' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') = expected, 'T10 approving must not notify again';
end $$;

-- T11: a department with no active staff still lets the request through, notifying nobody.
do $$
declare v_service text; v uuid;
begin
  select s.service_code into v_service from public.services_registry s
  where not exists (
    select 1 from public.profiles p
    where p.department_id = s.department_id
      and p.role in ('staff', 'supervisor') and p.access_status = 'active'
  )
  order by s.service_code limit 1;

  if v_service is null then
    raise notice 'T11 skipped: every department currently has active staff';
    return;
  end if;

  v := pg_temp.new_request(v_service, 0);
  assert pg_temp.n(v, 'new_request') = 0, 'T11 unstaffed department must produce no rows';
end $$;

-- T12: a failing notification insert must not fail the originating write.
do $$
declare v uuid;
begin
  alter table public.staff_notifications
    add constraint t_force_fail check (false) not valid;

  v := pg_temp.new_request(current_setting('t.service'), 0);  -- must not raise
  assert exists (select 1 from public.requests where id = v), 'T12 request must still be inserted';
  assert pg_temp.n(v, 'new_request') = 0, 'T12 forced failure should leave no notification rows';

  alter table public.staff_notifications drop constraint t_force_fail;
end $$;

-- T13: deleting a request removes its notifications.
do $$
declare v uuid := current_setting('t.req')::uuid;
begin
  assert (select count(*) from public.staff_notifications where request_id = v) > 0, 'T13 precondition';
  delete from public.requests where id = v;
  assert (select count(*) from public.staff_notifications where request_id = v) = 0,
    'T13 notifications must cascade with the request';
end $$;

-- T15: applicant-controlled text must not reach a staff feed. A request inserted
-- straight through the API with a free-form tracking number notifies nobody,
-- and is not blocked.
do $$
declare v uuid; tracking text := 'URGENT: call 0917-000-0000 and wire a fee';
begin
  insert into public.requests (tracking_number, applicant_id, request_type, status, fees_due)
  values (tracking, current_setting('t.applicant')::uuid, current_setting('t.service'), 'submitted', 0)
  returning id into v;
  assert exists (select 1 from public.requests where id = v), 'T15 request must still be inserted';
  assert pg_temp.n(v, 'new_request') = 0, 'T15 free-form tracking number must not be fanned out';
  assert not exists (select 1 from public.staff_notifications where title like '%URGENT%' or body like '%URGENT%'),
    'T15 free-form text reached a staff notification';
end $$;

-- T16: a requirement name the applicant typed is not shown; a catalog name is.
do $$
declare v uuid; a uuid; real_name text;
begin
  v := pg_temp.new_request(current_setting('t.service'), 0);
  select m.requirement_name into real_name from public.service_requirements_metadata m
  where m.service_code = current_setting('t.service') limit 1;

  insert into public.requirements_attachments (request_id, requirement_name, file_url, verification_status)
  values (v, 'FAKE ALERT: reply with your password', 'test/spoof.pdf', 'rejected')
  returning id into a;
  update public.requirements_attachments set verification_status = 'pending' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') > 0, 'T16 spoofed resubmission should still notify (generic text)';
  assert not exists (
    select 1 from public.staff_notifications where request_id = v and body like '%FAKE ALERT%'
  ), 'T16 applicant-typed requirement name reached a staff notification';

  if real_name is not null then
    -- Read the first alert so the next resubmission is not collapsed into it.
    update public.staff_notifications set is_read = true
    where request_id = v and type = 'document_resubmitted';
    insert into public.requirements_attachments (request_id, requirement_name, file_url, verification_status)
    values (v, real_name, 'test/real.pdf', 'rejected')
    returning id into a;
    update public.requirements_attachments set verification_status = 'pending' where id = a;
    assert exists (
      select 1 from public.staff_notifications where request_id = v and body like '%' || real_name || '%'
    ), 'T16 a catalog requirement name should be shown verbatim';
  end if;
end $$;

-- T17: flipping a document back and forth while the alert is unread does not
-- multiply notifications; once read, a new resubmission alerts again.
do $$
declare v uuid; a uuid; one_round int; after_flips int; reads_before int;
begin
  v := pg_temp.new_request(current_setting('t.service'), 0);
  insert into public.requirements_attachments (request_id, requirement_name, file_url, verification_status)
  values (v, 'TEST requirement', 'test/flip.pdf', 'rejected')
  returning id into a;

  update public.requirements_attachments set verification_status = 'pending' where id = a;
  one_round := pg_temp.n(v, 'document_resubmitted');
  assert one_round > 0, 'T17 first resubmission should notify';

  for i in 1..5 loop
    update public.requirements_attachments set verification_status = 'rejected' where id = a;
    update public.requirements_attachments set verification_status = 'pending' where id = a;
  end loop;
  after_flips := pg_temp.n(v, 'document_resubmitted');
  assert after_flips = one_round, format('T17 flips amplified rows: %s -> %s', one_round, after_flips);

  update public.staff_notifications set is_read = true where request_id = v and type = 'document_resubmitted';
  update public.requirements_attachments set verification_status = 'rejected' where id = a;
  update public.requirements_attachments set verification_status = 'pending' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') = one_round * 2, 'T17 after reading, a new resubmission should alert again';
end $$;

-- T18: an event is only announced by the role that may cause it. The RLS UPDATE
-- policies let any department staff write these columns straight through the
-- API, so a forged "payment verified" / "ready for release" / "resubmitted"
-- must not alert anyone.
do $$
declare
  v uuid; a uuid; admins int; cashiers int; expected int;
  jwt_cashier text := json_build_object('sub', current_setting('t.cashier'), 'role', 'authenticated')::text;
  jwt_staff text := json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text;
  jwt_applicant text := json_build_object('sub', current_setting('t.applicant'), 'role', 'authenticated')::text;
begin
  assert current_setting('t.cashier') <> '', 'fixture: need an active cashier';
  select count(*) into admins from public.profiles where role = 'admin' and access_status = 'active';
  select count(*) into cashiers from public.profiles where role = 'cashier' and access_status = 'active';
  select count(*) into expected from public.profiles
  where role in ('staff', 'supervisor') and access_status = 'active'
    and department_id = current_setting('t.dept');

  v := pg_temp.new_request(current_setting('t.service'), 100);

  -- A cashier cannot announce "ready for release".
  perform set_config('request.jwt.claims', jwt_cashier, true);
  update public.requests set status = 'ready_for_release' where id = v;
  assert pg_temp.n(v, 'awaiting_cashier') = 0, 'T18 cashier must not announce ready_for_release';
  update public.requests set status = 'processing' where id = v;

  -- Staff can.
  perform set_config('request.jwt.claims', jwt_staff, true);
  update public.requests set status = 'ready_for_release' where id = v;
  assert pg_temp.n(v, 'awaiting_cashier') = cashiers, 'T18 staff should announce ready_for_release';

  -- Staff cannot announce "payment verified".
  update public.requests
  set payment_status = 'verified', or_number = 'TEST-OR-' || gen_random_uuid() where id = v;
  assert pg_temp.n(v, 'ready_to_release') = 0, 'T18 staff must not forge a payment-verified alert';
  update public.requests set payment_status = 'unpaid', or_number = null where id = v;

  -- The cashier can.
  perform set_config('request.jwt.claims', jwt_cashier, true);
  update public.requests
  set payment_status = 'verified', or_number = 'TEST-OR-' || gen_random_uuid() where id = v;
  assert pg_temp.n(v, 'ready_to_release') = admins, 'T18 cashier should announce payment verified';

  -- Staff reverting a rejection is not a resubmission; the applicant resubmitting is.
  insert into public.requirements_attachments (request_id, requirement_name, file_url, verification_status)
  values (v, 'TEST requirement', 'test/t18.pdf', 'rejected')
  returning id into a;

  perform set_config('request.jwt.claims', jwt_staff, true);
  update public.requirements_attachments set verification_status = 'pending' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') = 0, 'T18 staff revert must not read as a resubmission';
  update public.requirements_attachments set verification_status = 'rejected' where id = a;

  perform set_config('request.jwt.claims', jwt_applicant, true);
  update public.requirements_attachments set verification_status = 'pending' where id = a;
  assert pg_temp.n(v, 'document_resubmitted') = expected, 'T18 the applicant resubmitting should notify';

  perform set_config('request.jwt.claims', '', true);
end $$;

-- T14: client roles cannot call the fan-out function directly.
set local role authenticated;
do $$
begin
  begin
    perform public.notify_internal_recipients(
      gen_random_uuid(), 'new_request', 't', 'b', array['staff'], false);
    raise exception 'authenticated must not be able to execute notify_internal_recipients';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
