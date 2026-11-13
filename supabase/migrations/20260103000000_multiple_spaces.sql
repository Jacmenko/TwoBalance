-- Multiple named spaces per account.
--
-- * a space (couples row) gets a name
-- * one user may now be a member of several spaces (still max two members each)
-- * invite regeneration and paid totals work per space instead of "the user's space"
-- * members can rename their space via rename_couple()

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.couples
  add column name text not null default 'Our space',
  add constraint couples_name_check check (char_length(btrim(name)) between 1 and 40);

grant select (name) on public.couples to authenticated;

alter table public.members drop constraint members_user_unique;

-- ---------------------------------------------------------------------------
-- create_couple(display name, space name)
-- ---------------------------------------------------------------------------

drop function public.create_couple(text);

create or replace function public.create_couple(
  p_display_name text,
  p_space_name text default 'Our space'
)
returns table (couple_id uuid, member_id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_display_name, ''));
  v_space text := btrim(coalesce(p_space_name, ''));
  v_code text;
  v_couple uuid;
  v_member uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 1 and 40 then
    raise exception 'invalid_display_name' using errcode = 'P0001';
  end if;
  if char_length(v_space) not between 1 and 40 then
    raise exception 'invalid_space_name' using errcode = 'P0001';
  end if;

  v_code := public.generate_invite_code();

  insert into public.couples (created_by, name, invite_code_hash, invite_expires_at)
  values (v_uid, v_space, public.hash_invite_code(v_code), now() + interval '7 days')
  returning id into v_couple;

  insert into public.members (couple_id, user_id, display_name)
  values (v_couple, v_uid, v_name)
  returning id into v_member;

  return query select v_couple, v_member, v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_couple: a user may join any number of spaces, but each only once
-- ---------------------------------------------------------------------------

create or replace function public.join_couple(p_code text, p_display_name text)
returns table (couple_id uuid, member_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_display_name, ''));
  v_couple public.couples%rowtype;
  v_member uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 1 and 40 then
    raise exception 'invalid_display_name' using errcode = 'P0001';
  end if;

  -- Lock the target couple row so concurrent joins are serialised.
  select * into v_couple
  from public.couples c
  where c.invite_code_hash = public.hash_invite_code(p_code)
  for update;

  -- Same error for "no such code" and "used/expired" to avoid leaking state.
  if not found
     or v_couple.invite_used_at is not null
     or (v_couple.invite_expires_at is not null and v_couple.invite_expires_at < now()) then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.members m
    where m.couple_id = v_couple.id and m.user_id = v_uid
  ) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  if (select count(*) from public.members m where m.couple_id = v_couple.id) <> 1 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  insert into public.members (couple_id, user_id, display_name)
  values (v_couple.id, v_uid, v_name)
  returning id into v_member;

  update public.couples
     set invite_used_at = now(), invite_code_hash = null
   where id = v_couple.id;

  return query select v_couple.id, v_member;
end;
$$;

-- ---------------------------------------------------------------------------
-- regenerate_invite(space)
-- ---------------------------------------------------------------------------

drop function public.regenerate_invite();

create or replace function public.regenerate_invite(p_couple_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
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

  perform 1 from public.couples c where c.id = p_couple_id for update;

  if (select count(*) from public.members m where m.couple_id = p_couple_id) >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  v_code := public.generate_invite_code();
  update public.couples
     set invite_code_hash = public.hash_invite_code(v_code),
         invite_expires_at = now() + interval '7 days',
         invite_used_at = null
   where id = p_couple_id;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- rename_couple(space, name)
-- ---------------------------------------------------------------------------

create or replace function public.rename_couple(p_couple_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_space text := btrim(coalesce(p_name, ''));
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if char_length(v_space) not between 1 and 40 then
    raise exception 'invalid_space_name' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.members m
    where m.couple_id = p_couple_id and m.user_id = v_uid
  ) then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;

  update public.couples set name = v_space where id = p_couple_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- paid_totals(space) (security invoker => RLS still applies)
-- ---------------------------------------------------------------------------

drop function public.paid_totals();

create or replace function public.paid_totals(p_couple_id uuid)
returns table (payer_member_id uuid, total_paid_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.payer_member_id, sum(e.amount_cents)::bigint
  from public.expenses e
  where e.deleted_at is null and e.couple_id = p_couple_id
  group by e.payer_member_id;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.create_couple(text, text)      from public, anon;
revoke all on function public.join_couple(text, text)        from public, anon;
revoke all on function public.regenerate_invite(uuid)        from public, anon;
revoke all on function public.rename_couple(uuid, text)      from public, anon;
revoke all on function public.paid_totals(uuid)              from public, anon;

grant execute on function public.create_couple(text, text)   to authenticated;
grant execute on function public.join_couple(text, text)     to authenticated;
grant execute on function public.regenerate_invite(uuid)     to authenticated;
grant execute on function public.rename_couple(uuid, text)   to authenticated;
grant execute on function public.paid_totals(uuid)           to authenticated;
