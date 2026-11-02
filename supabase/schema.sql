-- AuraLib database schema for Supabase.
-- Run once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run: tables are created only if missing, functions and policies are replaced.
--
-- Security model: every table has row level security (RLS). Clients read their own rows
-- directly; anything that changes shared state (loans, holds, room bookings) goes through
-- SECURITY DEFINER functions that check auth.uid() and the library rules on the server.

-- ============================================================ helpers

-- Library local time (Kazakhstan, UTC+5).
create or replace function public.al_now() returns timestamp
language sql stable as $$ select (now() at time zone 'utc') + interval '5 hours' $$;

-- Monday of the current week, library time. Book club weeks start on Monday.
create or replace function public.al_week() returns date
language sql stable as $$ select date_trunc('week', public.al_now())::date $$;

-- ============================================================ profiles

-- Public part: what other readers can see (leaderboard, reviews, club posts).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 24),
  team text not null default 'Other' check (char_length(team) between 1 and 40),
  public boolean not null default true,          -- show on the leaderboard
  created_at timestamptz not null default now()
);

-- Private part: only the owner can read it.
create table if not exists public.profile_private (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  student_id text not null unique check (student_id ~ '^\d{2}-\d{4}$'),
  goal int not null default 10 check (goal between 1 and 200)   -- books per semester
);

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;

drop policy if exists "profiles are readable" on public.profiles;
create policy "profiles are readable" on public.profiles for select using (true);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own private read" on public.profile_private;
create policy "own private read" on public.profile_private for select using (id = auth.uid());
drop policy if exists "own private update" on public.profile_private;
create policy "own private update" on public.profile_private for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Create both profile rows when someone signs up. Values come from signUp({ options: { data } }).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, team)
  values (new.id,
          left(coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), split_part(new.email, '@', 1)), 24),
          coalesce(nullif(new.raw_user_meta_data->>'team', ''), 'Other'));
  -- Users created by hand in the dashboard have no student ID; they get a public profile only.
  if coalesce(new.raw_user_meta_data->>'student_id', '') <> '' then
    insert into public.profile_private (id, full_name, student_id)
    values (new.id,
            coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Reader'),
            new.raw_user_meta_data->>'student_id');
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up form say "this student ID is taken" before submitting.
create or replace function public.student_id_taken(p_student_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profile_private where student_id = p_student_id)
$$;

-- Users cannot delete auth.users rows themselves; this does it for the caller only.
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'E_AUTH'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ============================================================ loans

create table if not exists public.loans (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null,
  subject text not null,                          -- copied from the catalog, used for contest points
  borrowed_at timestamptz not null default now(),
  due_at timestamptz not null default now() + interval '21 days',
  renewed int not null default 0,
  returned_at timestamptz
);
create unique index if not exists loans_one_active on public.loans (user_id, book_id) where returned_at is null;
create index if not exists loans_book on public.loans (book_id);
create index if not exists loans_returned on public.loans (returned_at);

alter table public.loans enable row level security;
drop policy if exists "own loans" on public.loans;
create policy "own loans" on public.loans for select using (user_id = auth.uid());

-- ============================================================ holds and notifications

create table if not exists public.holds (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id int not null,
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  ready_at timestamptz
);
create unique index if not exists holds_one_open on public.holds (user_id, book_id) where status in ('waiting', 'ready');
create index if not exists holds_book on public.holds (book_id, status, created_at);

alter table public.holds enable row level security;
drop policy if exists "own holds" on public.holds;
create policy "own holds" on public.holds for select using (user_id = auth.uid());

create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,                             -- 'hold_ready'
  book_id int,
  created_at timestamptz not null default now(),
  read boolean not null default false
);
alter table public.notifications enable row level security;
drop policy if exists "own notifications read" on public.notifications;
create policy "own notifications read" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "own notifications update" on public.notifications;
create policy "own notifications update" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own notifications delete" on public.notifications;
create policy "own notifications delete" on public.notifications for delete using (user_id = auth.uid());

-- Live delivery of notifications (Realtime respects the RLS policies above).
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ============================================================ loan functions

-- p_free: copies on the shelf as the catalog shows them. Ready holds reserve copies for their owners.
create or replace function public.borrow(p_book int, p_subject text, p_free int) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  reserved int;
begin
  if uid is null then raise exception 'E_AUTH'; end if;
  if (select count(*) from loans where user_id = uid and returned_at is null) >= 10 then raise exception 'E_LIMIT'; end if;
  if exists (select 1 from loans where user_id = uid and book_id = p_book and returned_at is null) then raise exception 'E_HAVE'; end if;
  select count(*) into reserved from holds where book_id = p_book and status = 'ready' and user_id <> uid;
  if not exists (select 1 from holds where book_id = p_book and status = 'ready' and user_id = uid)
     and coalesce(p_free, 0) - reserved <= 0 then
    raise exception 'E_RESERVED';
  end if;
  update holds set status = 'fulfilled' where user_id = uid and book_id = p_book and status in ('waiting', 'ready');
  insert into loans (user_id, book_id, subject) values (uid, p_book, left(coalesce(p_subject, ''), 40));
end $$;

create or replace function public.renew_loan(p_loan bigint) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare l loans;
begin
  select * into l from loans where id = p_loan and user_id = auth.uid() and returned_at is null for update;
  if not found then raise exception 'E_NOTFOUND'; end if;
  if l.renewed >= 2 then raise exception 'E_RENEW_LIMIT'; end if;
  if exists (select 1 from holds where book_id = l.book_id and status = 'waiting' and user_id <> auth.uid()) then
    raise exception 'E_HOLDS';
  end if;
  update loans set due_at = due_at + interval '14 days', renewed = renewed + 1 where id = p_loan
  returning due_at into l.due_at;
  return l.due_at;
end $$;

-- Returning a book passes it to the first reader in the hold queue and notifies them.
create or replace function public.return_loan(p_loan bigint) returns void
language plpgsql security definer set search_path = public as $$
declare
  l loans;
  h holds;
begin
  select * into l from loans where id = p_loan and user_id = auth.uid() and returned_at is null for update;
  if not found then raise exception 'E_NOTFOUND'; end if;
  update loans set returned_at = now() where id = p_loan;
  select * into h from holds where book_id = l.book_id and status = 'waiting'
    order by created_at limit 1 for update skip locked;
  if found then
    update holds set status = 'ready', ready_at = now() where id = h.id;
    insert into notifications (user_id, kind, book_id) values (h.user_id, 'hold_ready', l.book_id);
  end if;
end $$;

create or replace function public.place_hold(p_book int) returns int
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'E_AUTH'; end if;
  if exists (select 1 from loans where user_id = uid and book_id = p_book and returned_at is null) then raise exception 'E_HAVE'; end if;
  if exists (select 1 from holds where user_id = uid and book_id = p_book and status in ('waiting', 'ready')) then raise exception 'E_HELD'; end if;
  if (select count(*) from holds where user_id = uid and status in ('waiting', 'ready')) >= 5 then raise exception 'E_HOLD_LIMIT'; end if;
  insert into holds (user_id, book_id) values (uid, p_book);
  return (select count(*) from holds where book_id = p_book and status = 'waiting')::int;
end $$;

create or replace function public.cancel_hold(p_hold bigint) returns void
language plpgsql security definer set search_path = public as $$
declare h holds;
begin
  update holds set status = 'cancelled'
   where id = p_hold and user_id = auth.uid() and status in ('waiting', 'ready')
  returning * into h;
  if not found then raise exception 'E_NOTFOUND'; end if;
  -- A cancelled ready hold frees the copy for the next reader in line.
  if h.ready_at is not null then
    update holds set status = 'ready', ready_at = now()
     where id = (select id from holds where book_id = h.book_id and status = 'waiting' order by created_at limit 1)
    returning * into h;
    if found then insert into notifications (user_id, kind, book_id) values (h.user_id, 'hold_ready', h.book_id); end if;
  end if;
end $$;

-- Your open holds with your place in each queue.
create or replace function public.my_holds()
returns table (id bigint, book_id int, status text, queue_position int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select h.id, h.book_id, h.status,
         case when h.status = 'ready' then 0
              else (select count(*) from holds h2 where h2.book_id = h.book_id and h2.status = 'waiting'
                      and h2.created_at <= h.created_at)::int end,
         h.created_at
    from holds h
   where h.user_id = auth.uid() and h.status in ('waiting', 'ready')
   order by h.created_at
$$;

-- ============================================================ reviews

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  book_id int not null,
  rating int not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, book_id)
);
create index if not exists reviews_book on public.reviews (book_id);

alter table public.reviews enable row level security;
drop policy if exists "reviews are readable" on public.reviews;
create policy "reviews are readable" on public.reviews for select using (true);
-- Only readers who have borrowed the book can review it.
drop policy if exists "readers write reviews" on public.reviews;
create policy "readers write reviews" on public.reviews for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.loans l where l.user_id = auth.uid() and l.book_id = reviews.book_id));
drop policy if exists "own reviews update" on public.reviews;
create policy "own reviews update" on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own reviews delete" on public.reviews;
create policy "own reviews delete" on public.reviews for delete using (user_id = auth.uid());

-- Live numbers per book: copies out, popularity, queue length, rating.
create or replace function public.book_stats()
returns table (book_id int, active int, loans90 int, waiting int, ready int, next_due timestamptz, rating numeric, reviews int)
language sql stable security definer set search_path = public as $$
  with ids as (
    select book_id from loans union select book_id from reviews
    union select book_id from holds where status in ('waiting', 'ready'))
  select i.book_id,
    (select count(*) from loans l where l.book_id = i.book_id and l.returned_at is null)::int,
    (select count(*) from loans l where l.book_id = i.book_id and l.borrowed_at > now() - interval '90 days')::int,
    (select count(*) from holds h where h.book_id = i.book_id and h.status = 'waiting')::int,
    (select count(*) from holds h where h.book_id = i.book_id and h.status = 'ready')::int,
    (select min(due_at) from loans l where l.book_id = i.book_id and l.returned_at is null),
    (select round(avg(rating), 2) from reviews r where r.book_id = i.book_id),
    (select count(*) from reviews r where r.book_id = i.book_id)::int
  from ids i
$$;

-- ============================================================ study rooms

-- One row per booked room-hour. The unique constraints make double booking impossible,
-- even when two people press "Confirm" at the same moment.
create table if not exists public.room_slots (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  room text not null,
  day date not null,
  hour int not null check (hour between 0 and 23),
  created_at timestamptz not null default now(),
  unique (room, day, hour),
  unique (user_id, day, hour)
);
alter table public.room_slots enable row level security;
drop policy if exists "own room slots" on public.room_slots;
create policy "own room slots" on public.room_slots for select using (user_id = auth.uid());

-- Same rules as the client: 9:00-20:00, at most 3 h per booking and per day, up to 7 days ahead.
create or replace function public.book_room(p_room text, p_day date, p_start int, p_end int) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  nowl timestamp := public.al_now();
  used int;
  c text;
  h int;
begin
  if uid is null then raise exception 'E_AUTH'; end if;
  if p_room not in ('R1', 'R2', 'R3', 'R4', 'R5') or p_day is null then raise exception 'E_INPUT'; end if;
  if p_start < 9 or p_end > 20 or p_end <= p_start then raise exception 'E_HOURS'; end if;
  if p_end - p_start > 3 then raise exception 'E_DURATION'; end if;
  if p_day < nowl::date or (p_day = nowl::date and p_start <= extract(hour from nowl)) then raise exception 'E_PAST'; end if;
  if p_day > nowl::date + 7 then raise exception 'E_AHEAD'; end if;
  if exists (select 1 from room_slots where user_id = uid and day = p_day and hour >= p_start and hour < p_end) then
    raise exception 'E_SELF';
  end if;
  select count(*) into used from room_slots where user_id = uid and day = p_day;
  if used + (p_end - p_start) > 3 then raise exception 'E_DAILY'; end if;
  c := 'AL-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
  begin
    for h in p_start .. p_end - 1 loop
      insert into room_slots (user_id, code, room, day, hour) values (uid, c, p_room, p_day, h);
    end loop;
  exception when unique_violation then
    raise exception 'E_CONFLICT';
  end;
  return c;
end $$;

create or replace function public.cancel_room(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  d date;
  st int;
begin
  select min(day), min(hour) into d, st from room_slots where user_id = auth.uid() and code = p_code;
  if d is null then raise exception 'E_NOTFOUND'; end if;
  if (d + make_interval(hours => st)) - public.al_now() < interval '30 minutes' then raise exception 'E_LATE'; end if;
  delete from room_slots where user_id = auth.uid() and code = p_code;
end $$;

-- Which room-hours are taken (without saying by whom), plus which of them are yours.
create or replace function public.busy_slots(p_from date, p_to date)
returns table (room text, day date, hour int, mine boolean)
language sql stable security definer set search_path = public as $$
  select room, day, hour, user_id = auth.uid() from room_slots where day between p_from and p_to
$$;

-- ============================================================ reading challenge

-- A returned book counts once per reader per month, at most 3 per day (no speed-borrowing).
create or replace function public.counted_reads(p_month date)
returns table (user_id uuid, book_id int, subject text, returned_at timestamptz)
language sql stable security definer set search_path = public as $$
  with r as (
    select l.user_id, l.book_id, l.subject, l.returned_at,
           row_number() over (partition by l.user_id, l.book_id order by l.returned_at) as nb
      from loans l
     where l.returned_at is not null
       and (l.returned_at at time zone 'utc') + interval '5 hours' >= p_month
       and (l.returned_at at time zone 'utc') + interval '5 hours' < p_month + interval '1 month'
  ), d as (
    select r.*, row_number() over (
             partition by r.user_id, ((r.returned_at at time zone 'utc') + interval '5 hours')::date
             order by r.returned_at) as nd
      from r where nb = 1
  )
  select d.user_id, d.book_id, d.subject, d.returned_at from d where nd <= 3
$$;
revoke execute on function public.counted_reads(date) from public, anon, authenticated;

-- Points: 10 per counted book + 5 per different subject that month.
create or replace function public.leaderboard(p_month date)
returns table (rank int, nickname text, team text, books int, points int, is_me boolean)
language sql stable security definer set search_path = public as $$
  with s as (
    select c.user_id, count(*)::int as books, (count(*) * 10 + count(distinct c.subject) * 5)::int as points
      from public.counted_reads(p_month) c group by c.user_id
  )
  select (rank() over (order by s.points desc, s.books desc))::int, p.nickname, p.team, s.books, s.points,
         s.user_id = auth.uid()
    from s join profiles p on p.id = s.user_id
   where p.public or s.user_id = auth.uid()
   order by 1, p.nickname
   limit 100
$$;

create or replace function public.team_board(p_month date)
returns table (team text, readers int, books int, points int)
language sql stable security definer set search_path = public as $$
  with s as (
    select c.user_id, count(*)::int as books, (count(*) * 10 + count(distinct c.subject) * 5)::int as points
      from public.counted_reads(p_month) c group by c.user_id
  )
  select p.team, count(*)::int, sum(s.books)::int, sum(s.points)::int
    from s join profiles p on p.id = s.user_id
   group by p.team
   order by sum(s.points) desc
$$;

-- ============================================================ book club

-- Votes in week W choose the book of week W+1.
create table if not exists public.club_votes (
  week date not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  book_id int not null,
  primary key (week, user_id)
);
alter table public.club_votes enable row level security;
drop policy if exists "votes are readable" on public.club_votes;
create policy "votes are readable" on public.club_votes for select using (true);
drop policy if exists "vote this week" on public.club_votes;
create policy "vote this week" on public.club_votes for insert
  with check (user_id = auth.uid() and week = public.al_week());
drop policy if exists "change own vote" on public.club_votes;
create policy "change own vote" on public.club_votes for update
  using (user_id = auth.uid() and week = public.al_week())
  with check (user_id = auth.uid() and week = public.al_week());
drop policy if exists "remove own vote" on public.club_votes;
create policy "remove own vote" on public.club_votes for delete
  using (user_id = auth.uid() and week = public.al_week());

create table if not exists public.club_posts (
  id bigint generated always as identity primary key,
  week date not null,
  book_id int not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists club_posts_week on public.club_posts (week, created_at);
alter table public.club_posts enable row level security;
drop policy if exists "posts are readable" on public.club_posts;
create policy "posts are readable" on public.club_posts for select using (true);
drop policy if exists "post as yourself" on public.club_posts;
create policy "post as yourself" on public.club_posts for insert
  with check (user_id = auth.uid() and week = public.al_week());
drop policy if exists "delete own posts" on public.club_posts;
create policy "delete own posts" on public.club_posts for delete using (user_id = auth.uid());
