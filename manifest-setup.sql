-- SelutionSG live event-day manifest: one-time Supabase setup.
-- Run this in: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.
-- (Run supabase-setup.sql first if you haven't.)

-- 0. Columns attendance.js writes that the original setup script didn't
--    create. No-ops if your live table already has them.
alter table public.checkins add column if not exists record_type text not null default 'in';
alter table public.checkins add column if not exists location_text text;

-- 1. Events table: one row per booked event. You add rows via the
--    dashboard (Table Editor) — this is where an event code gets its
--    venue, role, call time and headcount. Only events dated today
--    appear on the homepage manifest.
create table public.events (
  event_code text primary key,
  event_date date not null,
  call_time text not null default '',   -- e.g. '07:30'
  venue text not null,
  role text not null default '',
  crew_called int not null default 0
);

alter table public.events enable row level security;

create policy "anon can read events"
on public.events for select
to anon
using (true);

-- 2. Aggregate check-in counts for today's events. SECURITY DEFINER lets
--    it read the checkins table (which RLS hides from visitors) while
--    exposing only counts — never names, phones, locations or selfies.
create or replace function public.manifest_today()
returns table (
  event_code text,
  call_time text,
  venue text,
  role text,
  crew_called int,
  checked_in bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.event_code,
    e.call_time,
    e.venue,
    e.role,
    e.crew_called,
    (
      select count(distinct c.phone)
      from public.checkins c
      where c.event_code = e.event_code
        and coalesce(c.record_type, 'in') = 'in'
        and (c.created_at at time zone 'Asia/Singapore')::date = e.event_date
    ) as checked_in
  from public.events e
  where e.event_date = (now() at time zone 'Asia/Singapore')::date
  order by e.call_time;
$$;

grant execute on function public.manifest_today() to anon;
