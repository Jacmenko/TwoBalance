-- Delete a space, or change a space to single-person.
--
-- * delete_couple(space): any member permanently deletes the space for everyone
-- * split_couple(space): turns a space into single-person space(s)
--     - shared by two people: each person gets their own single-person copy holding all
--       (non-deleted) expenses, and the shared space is removed
--     - only one member so far: the space simply becomes single-person
-- * expenses_before_write keeps created_at when copying (app.copy_expenses = 'on'), so the
--   copies keep the original ordering

-- ---------------------------------------------------------------------------
-- Expense trigger: allow created_at to be preserved while copying
-- ---------------------------------------------------------------------------

create or replace function public.expenses_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.description := btrim(new.description);

  if not exists (
    select 1 from public.categories c where c.id = new.category_id and c.active
  ) then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    if coalesce(current_setting('app.copy_expenses', true), '') <> 'on' then
      new.created_at := now();
    end if;
    new.updated_at := now();
    new.deleted_at := null;
  else
    -- immutable fields
    new.id := old.id;
    new.couple_id := old.couple_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_couple(space)
-- ---------------------------------------------------------------------------

create or replace function public.delete_couple(p_couple_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.members m
    where m.couple_id = p_couple_id and m.user_id = v_uid
  ) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;

  -- members and expenses go with it (on delete cascade)
  delete from public.couples where id = p_couple_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- split_couple(space) -> the caller's single-person space
-- ---------------------------------------------------------------------------

create or replace function public.split_couple(p_couple_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_couple public.couples%rowtype;
  v_member record;
  v_new_couple uuid;
  v_new_member uuid;
  v_mine uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.members m
    where m.couple_id = p_couple_id and m.user_id = v_uid
  ) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;

  select * into v_couple from public.couples c where c.id = p_couple_id for update;
  if v_couple.solo then
    raise exception 'already_solo' using errcode = 'P0001';
  end if;

  -- Nobody has joined yet: just make it single-person and drop the pending invite.
  if (select count(*) from public.members m where m.couple_id = p_couple_id) = 1 then
    update public.couples
       set solo = true,
           invite_code_hash = null,
           invite_expires_at = null,
           invite_used_at = null
     where id = p_couple_id;
    return p_couple_id;
  end if;

  -- Two people: one single-person copy each, with every (non-deleted) expense.
  perform set_config('app.copy_expenses', 'on', true);

  for v_member in
    select m.user_id, m.display_name
    from public.members m
    where m.couple_id = p_couple_id
    order by m.created_at
  loop
    insert into public.couples (created_by, name, solo)
    values (v_member.user_id, v_couple.name, true)
    returning id into v_new_couple;

    insert into public.members (couple_id, user_id, display_name)
    values (v_new_couple, v_member.user_id, v_member.display_name)
    returning id into v_new_member;

    -- The only member of a solo space is the payer of everything in it.
    insert into public.expenses
      (couple_id, payer_member_id, category_id, amount_cents, description, expense_date, created_at)
    select v_new_couple, v_new_member, e.category_id, e.amount_cents, e.description,
           e.expense_date, e.created_at
    from public.expenses e
    where e.couple_id = p_couple_id and e.deleted_at is null;

    if v_member.user_id = v_uid then
      v_mine := v_new_couple;
    end if;
  end loop;

  perform set_config('app.copy_expenses', 'off', true);

  delete from public.couples where id = p_couple_id;
  return v_mine;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.delete_couple(uuid) from public, anon;
revoke all on function public.split_couple(uuid)  from public, anon;

grant execute on function public.delete_couple(uuid) to authenticated;
grant execute on function public.split_couple(uuid)  to authenticated;
