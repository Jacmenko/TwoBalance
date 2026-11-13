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
select pg_temp.expect_fail($$select * from public.create_couple('X','S',false)$$, 'permission denied');
select pg_temp.expect_fail($$select * from public.join_couple('AAAA-AAAA-AAAA','X')$$, 'permission denied');
select pg_temp.reset_role();

-- 2. User 1 creates a couple --------------------------------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$
declare r record;
begin
  select * into r from public.create_couple('Alice', 'Home');
  insert into ctx values ('couple1', r.couple_id::text), ('member1', r.member_id::text),
                         ('code1', r.invite_code);
  if r.invite_code !~ '^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$' then
    raise exception 'FAIL: invite code format %', r.invite_code;
  end if;
end $$;

-- cannot join own space with its own code
select pg_temp.expect_fail(
  format($f$select * from public.join_couple(%L,'Alice again')$f$, (select v from ctx where k='code1')),
  'already_member');

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
  select * into r from public.create_couple('Carol', 'Carol space');
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
    (select v from ctx where k='couple1'), (select v from ctx where k='member1')), 'invalid_category');

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
  if (select total_paid_cents from public.paid_totals((select v::uuid from ctx where k='couple1'))) <> 1500 then raise exception 'FAIL: paid_totals after edit'; end if;
  update public.expenses set deleted_at = now();
  if (select count(*) from public.paid_totals((select v::uuid from ctx where k='couple1'))) <> 0 then raise exception 'FAIL: deleted expense counted'; end if;
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

-- 8b. Several named spaces per account; rename; per-space invite --------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$
declare r record;
begin
  select * into r from public.create_couple('Alice', '  Trip  ');
  insert into ctx values ('couple1b', r.couple_id::text);
  if (select count(*) from public.members where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 2 then
    raise exception 'FAIL: user should belong to two spaces';
  end if;
  if (select name from public.couples where id = r.couple_id) <> 'Trip' then
    raise exception 'FAIL: space name not stored/trimmed';
  end if;
  perform pg_temp.expect_fail($q$select * from public.create_couple('Alice', '   ')$q$, 'invalid_space_name');
  -- a new invite for the second space does not touch the first
  perform public.regenerate_invite(r.couple_id);
  -- totals are per space
  if (select count(*) from public.paid_totals(r.couple_id)) <> 0 then
    raise exception 'FAIL: second space should have no totals';
  end if;
end $$;
select pg_temp.reset_role();

-- an outsider can neither rename nor re-invite another couple's space, nor read its totals
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
do $$
begin
  perform pg_temp.expect_fail(format($f$select public.rename_couple(%L,'Hacked')$f$,
    (select v from ctx where k='couple1')), 'not_a_member');
  perform pg_temp.expect_fail(format($f$select public.regenerate_invite(%L)$f$,
    (select v from ctx where k='couple1')), 'not_a_member');
  if (select count(*) from public.paid_totals((select v::uuid from ctx where k='couple1'))) <> 0 then
    raise exception 'FAIL: outsider sees totals';
  end if;
end $$;
select pg_temp.reset_role();

-- a member can rename; a full space cannot issue a new invite
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
do $$
begin
  perform public.rename_couple((select v::uuid from ctx where k='couple1'), ' Our home ');
  if (select name from public.couples where id = (select v::uuid from ctx where k='couple1')) <> 'Our home' then
    raise exception 'FAIL: rename did not apply';
  end if;
  perform pg_temp.expect_fail(format($f$select public.regenerate_invite(%L)$f$,
    (select v from ctx where k='couple1')), 'couple_full');
end $$;
select pg_temp.reset_role();

-- 8c. Solo (single-person) spaces ------------------------------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000004');
do $$
declare r record;
begin
  select * into r from public.create_couple('Dan', 'Just me', true);
  insert into ctx values ('couple4', r.couple_id::text);
  if r.invite_code is not null then
    raise exception 'FAIL: solo space must not have an invite code';
  end if;
  if not (select solo from public.couples where id = r.couple_id) then
    raise exception 'FAIL: solo flag not set';
  end if;
  -- nobody can join a solo space (no invite exists)
  perform pg_temp.expect_fail($q$select * from public.join_couple('AAAA-AAAA-AAAA','X')$q$, 'invalid_invite');
end $$;
select pg_temp.reset_role();

-- an outsider cannot convert someone else's solo space
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
do $$
begin
  perform pg_temp.expect_fail(format($f$select public.regenerate_invite(%L)$f$,
    (select v from ctx where k='couple4')), 'not_a_member');
end $$;
select pg_temp.reset_role();

-- the owner can turn it into a shared space by inviting someone
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000004');
do $$
declare c text;
begin
  c := public.regenerate_invite((select v::uuid from ctx where k='couple4'));
  if c is null then raise exception 'FAIL: no invite returned'; end if;
  if (select solo from public.couples where id = (select v::uuid from ctx where k='couple4')) then
    raise exception 'FAIL: space should no longer be solo';
  end if;
end $$;
select pg_temp.reset_role();

-- 8d. Delete a space; change a space to single-person (two solo copies) ------------
-- Two fixture expenses with old created_at values (copy mode keeps created_at).
select pg_temp.reset_role();
select set_config('app.copy_expenses', 'on', false);
insert into public.expenses
  (couple_id, payer_member_id, category_id, amount_cents, description, expense_date, created_at)
values
  ((select v::uuid from ctx where k='couple1'), (select v::uuid from ctx where k='member1'),
   '00000000-0000-4000-8000-000000000001', 1000, 'A', date '2026-01-01', timestamptz '2020-01-01 10:00+00'),
  ((select v::uuid from ctx where k='couple1'), (select v::uuid from ctx where k='member2'),
   '00000000-0000-4000-8000-000000000002', 2500, 'B', date '2026-01-02', timestamptz '2020-01-02 10:00+00');
select set_config('app.copy_expenses', 'off', false);

-- an outsider can neither split nor delete someone else's space
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000003');
do $$
begin
  perform pg_temp.expect_fail(format($f$select public.split_couple(%L)$f$,
    (select v from ctx where k='couple1')), 'not_a_member');
  perform pg_temp.expect_fail(format($f$select public.delete_couple(%L)$f$,
    (select v from ctx where k='couple1')), 'not_a_member');
end $$;
select pg_temp.reset_role();

-- user 1 changes the shared space to single-person
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000001');
do $$
declare v_new uuid;
begin
  v_new := public.split_couple((select v::uuid from ctx where k='couple1'));
  insert into ctx values ('solo1', v_new::text);
  if (select count(*) from public.couples where id = (select v::uuid from ctx where k='couple1')) <> 0 then
    raise exception 'FAIL: original space still visible';
  end if;
  if not (select solo from public.couples where id = v_new) then
    raise exception 'FAIL: copy is not solo';
  end if;
  if (select name from public.couples where id = v_new) <> 'Our home' then
    raise exception 'FAIL: copy lost the space name';
  end if;
  if (select count(*) from public.members where couple_id = v_new) <> 1 then
    raise exception 'FAIL: copy should have exactly one member';
  end if;
  if (select count(*) from public.expenses where couple_id = v_new) <> 2 then
    raise exception 'FAIL: copy should hold both expenses';
  end if;
  if (select sum(total_paid_cents) from public.paid_totals(v_new)) <> 3500 then
    raise exception 'FAIL: copy total';
  end if;
end $$;
select pg_temp.reset_role();

-- the partner got their own copy too; the original and its data are gone
do $$
begin
  if exists (select 1 from public.couples where id = (select v::uuid from ctx where k='couple1')) then
    raise exception 'FAIL: original space not removed';
  end if;
  if exists (select 1 from public.expenses where couple_id = (select v::uuid from ctx where k='couple1')) then
    raise exception 'FAIL: original expenses not removed';
  end if;
  if (select count(*) from public.expenses e join public.couples c on c.id = e.couple_id
        where c.solo and c.created_by = 'aaaaaaaa-0000-0000-0000-000000000002') <> 2 then
    raise exception 'FAIL: partner copy missing expenses';
  end if;
  if (select min(created_at) from public.expenses where couple_id = (select v::uuid from ctx where k='solo1'))
       <> timestamptz '2020-01-01 10:00+00' then
    raise exception 'FAIL: created_at not preserved in copy';
  end if;
end $$;

-- the partner sees their copy (and only theirs) and can keep using it
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
do $$
begin
  if (select count(*) from public.couples where solo) <> 1 then
    raise exception 'FAIL: partner should see exactly one solo space';
  end if;
  if (select count(*) from public.expenses) <> 2 then
    raise exception 'FAIL: partner should see 2 expenses';
  end if;
end $$;
select pg_temp.reset_role();

-- a space still waiting for a partner just becomes solo (same id); delete removes it
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000004');
do $$
declare v_id uuid;
begin
  v_id := public.split_couple((select v::uuid from ctx where k='couple4'));
  if v_id <> (select v::uuid from ctx where k='couple4') then
    raise exception 'FAIL: waiting space should keep its id';
  end if;
  if not (select solo from public.couples where id = v_id) then
    raise exception 'FAIL: waiting space did not become solo';
  end if;
  perform pg_temp.expect_fail(format($f$select public.split_couple(%L)$f$, v_id), 'already_solo');

  perform public.delete_couple(v_id);
  if exists (select 1 from public.couples where id = v_id) then
    raise exception 'FAIL: space not deleted';
  end if;
  perform pg_temp.expect_fail(format($f$select public.delete_couple(%L)$f$, v_id), 'not_a_member');
end $$;
select pg_temp.reset_role();

-- 9. Anonymous-role cannot reach privileged helpers -----------------------------
select pg_temp.as_user('aaaaaaaa-0000-0000-0000-000000000002');
select pg_temp.expect_fail($$select public.generate_invite_code()$$, 'permission denied');
select pg_temp.expect_fail($$select public.hash_invite_code('x')$$, 'permission denied');
select pg_temp.reset_role();

select 'ALL SECURITY TESTS PASSED' as result;
rollback;
