-- TwoBalance initial schema.
-- Money is stored as integer cents (bigint). Soft delete is used for expenses
-- (deleted_at); every read path MUST filter `deleted_at is null`.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.couples (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  created_by        uuid not null references auth.users (id) on delete cascade,
  invite_code_hash  text,
  invite_expires_at timestamptz,
  invite_used_at    timestamptz
);

create table public.members (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  display_name  text not null,
  created_at    timestamptz not null default now(),
  constraint members_couple_user_unique unique (couple_id, user_id),
  -- one authenticated identity may belong to only one shared space
  constraint members_user_unique unique (user_id),
  constraint members_display_name_check
    check (char_length(btrim(display_name)) between 1 and 40),
  -- needed for the composite FK from expenses (payer must be in same couple)
  constraint members_id_couple_unique unique (id, couple_id)
);
create index members_couple_idx on public.members (couple_id);

create table public.categories (
  id          uuid primary key,
  name        text not null unique,
  icon        text,
  sort_order  integer not null,
  active      boolean not null default true
);

create table public.expenses (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples (id) on delete cascade,
  payer_member_id  uuid not null,
  category_id      uuid not null references public.categories (id),
  amount_cents     bigint not null,
  description      text not null,
  expense_date     date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  constraint expenses_amount_check
    check (amount_cents > 0 and amount_cents <= 100000000),   -- max 1,000,000.00
  constraint expenses_description_check
    check (char_length(btrim(description)) between 1 and 120),
  -- payer must belong to the same couple as the expense
  constraint expenses_payer_same_couple_fk
    foreign key (payer_member_id, couple_id)
    references public.members (id, couple_id)
);
create index expenses_couple_date_idx on public.expenses (couple_id, expense_date desc);
create index expenses_couple_payer_idx on public.expenses (couple_id, payer_member_id);
create index expenses_couple_category_idx on public.expenses (couple_id, category_id);

-- ---------------------------------------------------------------------------
-- Seed categories (stable IDs)
-- ---------------------------------------------------------------------------

insert into public.categories (id, name, icon, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'Groceries',     'shopping-basket', 1),
  ('00000000-0000-4000-8000-000000000002', 'Restaurants',   'utensils',        2),
  ('00000000-0000-4000-8000-000000000003', 'Transport',     'car',             3),
  ('00000000-0000-4000-8000-000000000004', 'Accommodation', 'bed',             4),
  ('00000000-0000-4000-8000-000000000005', 'Entertainment', 'ticket',          5),
  ('00000000-0000-4000-8000-000000000006', 'Household',     'home',            6),
  ('00000000-0000-4000-8000-000000000007', 'Shopping',      'shopping-bag',    7),
  ('00000000-0000-4000-8000-000000000008', 'Health',        'heart-pulse',     8),
  ('00000000-0000-4000-8000-000000000009', 'Other',         'circle',          9);

-- ---------------------------------------------------------------------------
-- Helper: membership check (SECURITY DEFINER so RLS policies don't recurse)
-- ---------------------------------------------------------------------------

create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.couple_id = p_couple_id and m.user_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Defense in depth: never more than two members, even if a future code path
-- inserts into members directly. Serialises on the couple row.
create or replace function public.enforce_max_two_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.couples c where c.id = new.couple_id for update;
  if (select count(*) from public.members m where m.couple_id = new.couple_id) >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger members_max_two
  before insert on public.members
  for each row execute function public.enforce_max_two_members();

-- Expense validation + bookkeeping.
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
    new.created_at := now();
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

create trigger expenses_before_write
  before insert or update on public.expenses
  for each row execute function public.expenses_before_write();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.couples    enable row level security;
alter table public.members    enable row level security;
alter table public.categories enable row level security;
alter table public.expenses   enable row level security;

-- Privileges: nothing for anon; authenticated gets only what policies allow.
revoke all on public.couples, public.members, public.categories, public.expenses
  from public, anon, authenticated;

grant select on public.categories to authenticated;
grant select on public.couples    to authenticated;   -- see column grants below
grant select on public.members    to authenticated;
grant select, insert, update on public.expenses to authenticated;   -- no hard delete

-- Never expose the invite hash through the table API.
revoke select on public.couples from authenticated;
grant select (id, created_at, created_by, invite_expires_at, invite_used_at)
  on public.couples to authenticated;

create policy categories_read on public.categories
  for select to authenticated using (true);

create policy couples_read on public.couples
  for select to authenticated using (public.is_couple_member(id));

create policy members_read on public.members
  for select to authenticated using (public.is_couple_member(couple_id));

create policy expenses_read on public.expenses
  for select to authenticated using (public.is_couple_member(couple_id));

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (public.is_couple_member(couple_id));

create policy expenses_update on public.expenses
  for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

-- No insert/update/delete policies on couples or members: they are only
-- changed through the SECURITY DEFINER functions below.

-- ---------------------------------------------------------------------------
-- Invitation code helpers
-- ---------------------------------------------------------------------------

-- 12 chars from a 32-symbol alphabet without look-alikes = 60 bits of entropy.
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(12);
  code text := '';
  i int;
begin
  for i in 0..11 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return substr(code, 1, 4) || '-' || substr(code, 5, 4) || '-' || substr(code, 9, 4);
end;
$$;

create or replace function public.hash_invite_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- RPC: create_couple
-- ---------------------------------------------------------------------------

create or replace function public.create_couple(p_display_name text)
returns table (couple_id uuid, member_id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_display_name, ''));
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
  if exists (select 1 from public.members m where m.user_id = v_uid) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  v_code := public.generate_invite_code();

  insert into public.couples (created_by, invite_code_hash, invite_expires_at)
  values (v_uid, public.hash_invite_code(v_code), now() + interval '7 days')
  returning id into v_couple;

  insert into public.members (couple_id, user_id, display_name)
  values (v_couple, v_uid, v_name)
  returning id into v_member;

  return query select v_couple, v_member, v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: join_couple
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
  if exists (select 1 from public.members m where m.user_id = v_uid) then
    raise exception 'already_member' using errcode = 'P0001';
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
-- RPC: regenerate_invite (creator lost the code before partner joined)
-- ---------------------------------------------------------------------------

create or replace function public.regenerate_invite()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_couple uuid;
  v_code text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select m.couple_id into v_couple from public.members m where m.user_id = v_uid;
  if v_couple is null then
    raise exception 'not_a_member' using errcode = 'P0001';
  end if;

  perform 1 from public.couples c where c.id = v_couple for update;

  if (select count(*) from public.members m where m.couple_id = v_couple) >= 2 then
    raise exception 'couple_full' using errcode = 'P0001';
  end if;

  v_code := public.generate_invite_code();
  update public.couples
     set invite_code_hash = public.hash_invite_code(v_code),
         invite_expires_at = now() + interval '7 days',
         invite_used_at = null
   where id = v_couple;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: paid totals per payer (security invoker => RLS applies)
-- ---------------------------------------------------------------------------

create or replace function public.paid_totals()
returns table (payer_member_id uuid, total_paid_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.payer_member_id, sum(e.amount_cents)::bigint
  from public.expenses e
  where e.deleted_at is null
  group by e.payer_member_id;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: only signed-in (incl. anonymous-auth) users may call.
-- ---------------------------------------------------------------------------

revoke all on function public.create_couple(text)        from public, anon;
revoke all on function public.join_couple(text, text)    from public, anon;
revoke all on function public.regenerate_invite()        from public, anon;
revoke all on function public.paid_totals()              from public, anon;
revoke all on function public.is_couple_member(uuid)     from public, anon;
revoke all on function public.generate_invite_code()     from public, anon, authenticated;
revoke all on function public.hash_invite_code(text)     from public, anon, authenticated;

grant execute on function public.create_couple(text)       to authenticated;
grant execute on function public.join_couple(text, text)   to authenticated;
grant execute on function public.regenerate_invite()       to authenticated;
grant execute on function public.paid_totals()             to authenticated;
grant execute on function public.is_couple_member(uuid)    to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (RLS is applied to change events)
-- ---------------------------------------------------------------------------

alter table public.expenses replica identity full;
alter table public.members  replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.expenses;
    alter publication supabase_realtime add table public.members;
  end if;
end $$;
