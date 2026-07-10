-- SelutionSG crew check-in: one-time Supabase setup.
-- Run this in: Supabase dashboard -> SQL Editor -> New query -> paste -> Run.

-- 1. Check-ins table
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  phone text not null,
  event_code text not null,
  lat double precision,
  lng double precision,
  accuracy_m double precision,
  device_time timestamptz,
  selfie_path text,
  user_agent text
);

-- 2. Lock it down: public visitors can submit a check-in but can never
--    read, edit, or delete anything. You view data via the dashboard.
alter table public.checkins enable row level security;

create policy "anon can insert checkins"
on public.checkins for insert
to anon
with check (true);

-- 3. Private storage bucket for selfies
insert into storage.buckets (id, name, public)
values ('selfies', 'selfies', false);

create policy "anon can upload selfies"
on storage.objects for insert
to anon
with check (bucket_id = 'selfies');
