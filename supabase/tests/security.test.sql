-- Database security tests for TwoBalance.
--
-- Run against a LOCAL / throwaway Supabase database (never production):
--   supabase start && psql "$(supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '\"')" \
--     -v ON_ERROR_STOP=1 -f supabase/tests/security.test.sql
--
-- The whole script runs in one transaction that is rolled back at the end.
-- Any failed assertion raises an exception and aborts the run.
--
-- Not covered here (needs two real connections): a true concurrent-join race.
-- The join is serialised by `select ... for update` on the couple row plus the
-- `members_max_two` trigger that takes the same lock; test with two psql
-- sessions if you want to see it empirically.

begin;

create or replace function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;

create or replace function pg_temp.reset_role() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end $$;

-- Expect the statement (given as text) to fail; optionally with message fragment.
create or replace function pg_temp.expect_fail(p_sql text, p_fragment text default null)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_fragment is not null and position(p_fragment in sqlerrm) = 0 then
      raise exception 'FAIL: "%" failed with unexpected error: %', p_sql, sqlerrm;
    end if;
    return;
  end;
  raise exception 'FAIL: expected error but succeeded: %', p_sql;
end $$;

-- Fixtures: four auth users.
insert into auth.users (id, aud, role, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'authenticated', 'authenticated', true),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'authenticated', 'authenticated', true),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'authenticated', 'authenticated', true);

create temp table ctx (k text primary key, v text);
grant all on ctx to public;

-- 1. Unauthenticated (anon role) cannot read or call anything private -----------
select pg_temp.as_anon();
select pg_temp.expect_fail('select * from public.expenses', 'permission denied');
select pg_temp.expect_fail('select * from public.couples', 'permission denied');
select pg_temp.expect_fail('select * from public.members', 'permission denied');
select pg_temp.expect_fail($$select * from public.create_couple('X')$$, 'permission denied');
select pg_temp.expect_fail($$select * from public.join_couple('AAAA-AAAA-AAAA','X')$$, 'permission denied');
select pg_temp.reset_role();

-- 2. User 1 creates a couple --------------------------------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$
declare r record;
begin
  select * into r from public.create_couple('Alice');
  insert into ctx values ('couple1', r.couple_id::text), ('member1', r.member_id::text),
                         ('code1', r.invite_code);
  if r.invite_code !~ '^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$' then
    raise exception 'FAIL: invite code format %', r.invite_code;
  end if;
end $$;

-- cannot create a second couple
select pg_temp.expect_fail($$select * from public.create_couple('Alice again')$$, 'already_member');

-- invite hash is not readable via the table API
select pg_temp.expect_fail('select invite_code_hash from public.couples', 'permission denied');
select pg_temp.reset_role();

-- raw code is never stored
do $$
begin
  if exists (select 1 from public.couples where invite_code_hash = (select v from ctx where k='code1')) then
    raise exception 'FAIL: raw invite code stored';
  end if;
end $$;

-- 3. Wrong code is rejected; 4. User 2 joins -----------------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
select pg_temp.expect_fail($$select * from public.join_couple('ZZZZ-ZZZZ-ZZZZ','Bob')$$, 'invalid_invite');
do $$
declare r record;
begin
  select * into r from public.join_couple((select v from ctx where k='code1'), 'Bob');
  insert into ctx values ('member2', r.member_id::text);
  if r.couple_id::text <> (select v from ctx where k='couple1') then
    raise exception 'FAIL: joined wrong couple';
  end if;
end $$;
select pg_temp.reset_role();

-- 5. Third user cannot join with the (now used) code ---------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
do $$
begin
  perform pg_temp.expect_fail(
    format($f$select * from public.join_couple(%L,'Carol')$f$, (select v from ctx where k='code1')),
    'invalid_invite');
end $$;
select pg_temp.reset_role();

-- 5b. Even direct member insert cannot create a third member (trigger + no grant)
do $$
begin
  perform pg_temp.expect_fail(
    format($f$insert into public.members (couple_id, user_id, display_name)
              values (%L, 'aaaaaaaa-0000-0000-0000-000000000003', 'Carol')$f$,
           (select v from ctx where k='couple1')),
    'couple_full');
end $$;
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
do $$
begin
  perform pg_temp.expect_fail(
    format($f$insert into public.members (couple_id, user_id, display_name)
              values (%L, 'aaaaaaaa-0000-0000-0000-000000000003', 'Carol')$f$,
           (select v from ctx where k='couple1')),
    'permission denied');
end $$;
select pg_temp.reset_role();

-- 5c. Expired invite is rejected
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
do $$
declare r record;
begin
  select * into r from public.create_couple('Carol');
  insert into ctx values ('couple3', r.couple_id::text), ('member3', r.member_id::text),
                         ('code3', r.invite_code);
end $$;
select pg_temp.reset_role();
update public.couples set invite_expires_at = now() - interval '1 minute'
 where id = (select v::uuid from ctx where k='couple3');
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000004');
do $$
begin
  perform pg_temp.expect_fail(
    format($f$select * from public.join_couple(%L,'Dave')$f$, (select v from ctx where k='code3')),
    'invalid_invite');
end $$;
select pg_temp.reset_role();

-- 6. Expenses: members can write; outsiders cannot ------------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$
begin
  insert into public.expenses (couple_id, payer_member_id, category_id, amount_cents, description, expense_date)
  values ((select v::uuid from ctx where k='couple1'), (select v::uuid from ctx where k='member1'),
          '00000000-0000-4000-8000-000000000001', 1000, '  Groceries  ', current_date);
  if (select description from public.expenses limit 1) <> 'Groceries' then
    raise exception 'FAIL: description not trimmed';
  end if;

  -- validation
  perform pg_temp.expect_fail(format($f$insert into public.expenses
    (couple_id, payer_member_id, category_id, amount_cents, description, expense_date)
    values (%L,%L,'00000000-0000-4000-8000-000000000001',0,'x',current_date)$f$,
    (select v from ctx where k='couple1'), (select v from ctx where k='member1')), 'expenses_amount_check');
  perform pg_temp.expect_fail(format($f$insert into public.expenses
    (couple_id, payer_member_id, category_id, amount_cents, description, expense_date)
    values (%L,%L,'00000000-0000-4000-8000-000000000001',100,repeat('x',121),current_date)$f$,
    (select v from ctx where k='couple1'), (select v from ctx where k='member1')), 'expenses_description_check');
  perform pg_temp.expect_fail(format($f$insert into public.expenses
    (couple_id, payer_member_id, category_id, amount_cents, description, expense_date)
    values (%L,%L,'99999999-0000-4000-8000-000000000001',100,'x',current_date)$f$,
    (select v from ctx where k='couple1'), (select v from ctx where k='member1')), 'violates foreign key');

  -- payer from another couple is rejected
  perform pg_temp.expect_fail(format($f$insert into public.expenses
    (couple_id, payer_member_id, category_id, amount_cents, description, expense_date)
    values (%L,%L,'00000000-0000-4000-8000-000000000001',100,'x',current_date)$f$,
    (select v from ctx where k='couple1'), (select v from ctx where k='member3')), 'foreign key');

  -- cannot insert into another couple
  perform pg_temp.expect_fail(format($f$insert into public.expenses
    (couple_id, payer_member_id, category_id, amount_cents, description, expense_date)
    values (%L,%L,'00000000-0000-4000-8000-000000000001',100,'x',current_date)$f$,
    (select v from ctx where k='couple3'), (select v from ctx where k='member3')), 'row-level security');

  -- hard delete is not permitted
  perform pg_temp.expect_fail('delete from public.expenses', 'permission denied');
end $$;
select pg_temp.reset_role();

-- 7. User 2 sees the same expense; can edit and soft-delete ----------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
do $$
begin
  if (select count(*) from public.expenses) <> 1 then raise exception 'FAIL: partner cannot see expense'; end if;
  if (select count(*) from public.members) <> 2 then raise exception 'FAIL: partner cannot see members'; end if;
  update public.expenses set amount_cents = 1500;
  if (select total_paid_cents from public.paid_totals()) <> 1500 then raise exception 'FAIL: paid_totals after edit'; end if;
  update public.expenses set deleted_at = now();
  if (select count(*) from public.paid_totals()) <> 0 then raise exception 'FAIL: deleted expense counted'; end if;
end $$;
select pg_temp.reset_role();

-- 8. User 3 (other couple) sees nothing of couple 1 and cannot modify it --------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
do $$
begin
  if (select count(*) from public.expenses) <> 0 then raise exception 'FAIL: outsider sees expenses'; end if;
  if (select count(*) from public.couples where id = (select v::uuid from ctx where k='couple1')) <> 0 then
    raise exception 'FAIL: outsider sees couple'; end if;
  if (select count(*) from public.members where couple_id = (select v::uuid from ctx where k='couple1')) <> 0 then
    raise exception 'FAIL: outsider sees members'; end if;
  update public.expenses set amount_cents = 1;      -- RLS filters rows: 0 affected
end $$;
select pg_temp.reset_role();
do $$
begin
  if (select amount_cents from public.expenses) <> 1500 then raise exception 'FAIL: outsider modified expense'; end if;
end $$;

-- 9. Anonymous-role cannot reach privileged helpers -----------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
select pg_temp.expect_fail($$select public.generate_invite_code()$$, 'permission denied');
select pg_temp.expect_fail($$select public.hash_invite_code('x')$$, 'permission denied');
select pg_temp.reset_role();

select 'ALL SECURITY TESTS PASSED' as result;
rollback;
