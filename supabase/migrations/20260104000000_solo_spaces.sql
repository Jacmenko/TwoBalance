-- Single-person ("solo") spaces.
--
-- * couples.solo marks a space that is just for one person: no invite code exists for it,
--   so nobody can join it
-- * create_couple(..., p_solo) creates one (invite_code is null in that case)
-- * regenerate_invite() on a solo space turns it into a normal shared space

alter table public.couples add column solo boolean not null default false;

grant select (solo) on public.couples to authenticated;

-- ---------------------------------------------------------------------------
-- create_couple(display name, space name, solo)
-- ---------------------------------------------------------------------------

drop function public.create_couple(text, text);

create or replace function public.create_couple(
  p_display_name text,
  p_space_name text default 'Our space',
  p_solo boolean default false
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
  v_solo boolean := coalesce(p_solo, false);
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

  if v_solo then
    -- No invite at all: a solo space cannot be joined.
    insert into public.couples (created_by, name, solo)
    values (v_uid, v_space, true)
    returning id into v_couple;
  else
    v_code := public.generate_invite_code();
    insert into public.couples (created_by, name, invite_code_hash, invite_expires_at)
    values (v_uid, v_space, public.hash_invite_code(v_code), now() + interval '7 days')
    returning id into v_couple;
  end if;

  insert into public.members (couple_id, user_id, display_name)
  values (v_couple, v_uid, v_name)
  returning id into v_member;

  return query select v_couple, v_member, v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- regenerate_invite(space): also turns a solo space into a shared one
-- ---------------------------------------------------------------------------

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
         invite_used_at = null,
         solo = false
   where id = p_couple_id;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.create_couple(text, text, boolean) from public, anon;
grant execute on function public.create_couple(text, text, boolean) to authenticated;
