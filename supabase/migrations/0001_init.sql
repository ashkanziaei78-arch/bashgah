-- ============================================================
-- Fit Club — initial schema
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type user_role      as enum ('student', 'coach', 'admin');
create type plan_kind      as enum ('basic', 'pro', 'vip');
create type request_kind   as enum ('workout', 'diet');
create type request_status as enum ('pending', 'scheduled', 'done', 'cancelled');
create type checkin_kind   as enum ('in', 'out');
create type program_status as enum ('draft', 'published', 'archived');
create type member_status  as enum ('active', 'expired', 'frozen');

-- ---------- profiles ----------
create table public.profiles (
  id             uuid primary key references auth.users on delete cascade,
  full_name      text not null default '',
  phone          text unique,
  role           user_role not null default 'student',
  birth_date     date,
  sex            text check (sex in ('male', 'female')),
  height_cm      numeric(5,1),
  weight_kg      numeric(5,1),
  goal           text check (goal in ('gain', 'lose', 'maintain')),
  activity_level smallint default 3 check (activity_level between 1 and 5),
  avatar_url     text,
  created_at     timestamptz not null default now()
);

-- Every auth user gets a profile the moment they sign up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (new.id, new.phone, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- role helpers ----------
-- security definer so RLS policies can read the role without recursing
-- into the profiles policies themselves.
create or replace function public.fc_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.fc_is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.fc_role() in ('coach', 'admin'), false);
$$;

create or replace function public.fc_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.fc_role() = 'admin', false);
$$;

-- ---------- plans & memberships ----------
create table public.plans (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  kind           plan_kind not null,
  price_toman    bigint not null,
  duration_days  int not null default 30,
  sessions_total int,                       -- null = unlimited
  perks          text[] not null default '{}',
  is_active      boolean not null default true,
  sort_order     int not null default 0
);

create table public.memberships (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles on delete cascade,
  plan_id        uuid not null references public.plans,
  started_on     date not null default current_date,
  expires_on     date not null,
  sessions_total int,                       -- snapshot: plans can change later
  sessions_used  int not null default 0,
  status         member_status not null default 'active',
  created_at     timestamptz not null default now()
);
create index on public.memberships (student_id, status);

-- Remaining sessions, derived rather than stored, so it can never drift.
create or replace function public.sessions_left(m public.memberships)
returns int language sql stable as $$
  select case
    when m.sessions_total is null then null
    else greatest(0, m.sessions_total - m.sessions_used)
  end;
$$;

-- ---------- exercise library (admin-owned, video-backed) ----------
create table public.exercises (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  muscle_group     text not null,
  level            text not null default 'beginner'
                     check (level in ('beginner', 'intermediate', 'advanced')),
  video_path       text,                    -- Storage path in bucket 'exercise-videos'
  thumb_path       text,
  duration_seconds int,
  instructions     text,
  created_by       uuid references public.profiles,
  created_at       timestamptz not null default now()
);
create index on public.exercises (muscle_group);

-- ---------- workout programs ----------
create table public.programs (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles on delete cascade,
  coach_id     uuid not null references public.profiles,
  title        text not null,
  notes        text,
  status       program_status not null default 'draft',
  published_at timestamptz,
  created_at   timestamptz not null default now()
);
create index on public.programs (student_id, status);

create table public.program_items (
  id           uuid primary key default gen_random_uuid(),
  program_id   uuid not null references public.programs on delete cascade,
  exercise_id  uuid not null references public.exercises,
  position     int not null,
  sets         int not null default 3,
  reps         int not null default 12,
  rest_seconds int not null default 90,
  note         text,
  unique (program_id, position)
);

-- What the student actually lifted. One row per item per day, so
-- "last time" is a plain lookup rather than a scan.
create table public.workout_logs (
  id              uuid primary key default gen_random_uuid(),
  program_item_id uuid not null references public.program_items on delete cascade,
  student_id      uuid not null references public.profiles on delete cascade,
  performed_on    date not null default current_date,
  weight_kg       numeric(5,1),
  completed       boolean not null default false,
  note            text,
  updated_at      timestamptz not null default now(),
  unique (program_item_id, performed_on)
);
create index on public.workout_logs (student_id, performed_on desc);

-- ---------- nutrition ----------
create table public.diet_plans (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles on delete cascade,
  coach_id     uuid references public.profiles,
  title        text not null default 'برنامه غذایی',
  target_kcal  int not null,
  protein_g    int not null,
  carb_g       int not null,
  fat_g        int not null,
  -- true when the macros came from the calculator rather than the coach
  ai_generated boolean not null default false,
  status       program_status not null default 'draft',
  created_at   timestamptz not null default now()
);
create index on public.diet_plans (student_id, status);

create table public.diet_meals (
  id           uuid primary key default gen_random_uuid(),
  diet_plan_id uuid not null references public.diet_plans on delete cascade,
  position     int not null,
  name         text not null,
  time_of_day  time,
  items        text not null,
  kcal         int,
  unique (diet_plan_id, position)
);

-- ---------- requests & booking ----------
create table public.requests (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  coach_id   uuid references public.profiles,
  kind       request_kind not null,
  status     request_status not null default 'pending',
  slot_at    timestamptz,
  message    text,
  created_at timestamptz not null default now()
);
create index on public.requests (status, created_at desc);

-- ---------- check-in ----------
create table public.cards (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles on delete cascade,
  uid        text not null unique,          -- NFC tag serial
  label      text,
  active     boolean not null default true,
  issued_at  timestamptz not null default now()
);

create table public.checkins (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles on delete cascade,
  membership_id uuid references public.memberships on delete set null,
  card_id       uuid references public.cards on delete set null,
  kind          checkin_kind not null,
  at            timestamptz not null default now(),
  -- whether this tap actually consumed a session
  deducted      boolean not null default false
);
create index on public.checkins (student_id, at desc);
create index on public.checkins (at desc);

-- ---------- gym settings ----------
-- Single source of truth for feature flags, including the check-in
-- module the owner can switch off entirely.
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('checkin_module_enabled', 'true'::jsonb),
  ('gym_name',               '"Fit Club"'::jsonb);

-- ============================================================
-- Row level security
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.plans         enable row level security;
alter table public.memberships   enable row level security;
alter table public.exercises     enable row level security;
alter table public.programs      enable row level security;
alter table public.program_items enable row level security;
alter table public.workout_logs  enable row level security;
alter table public.diet_plans    enable row level security;
alter table public.diet_meals    enable row level security;
alter table public.requests      enable row level security;
alter table public.cards         enable row level security;
alter table public.checkins      enable row level security;
alter table public.settings      enable row level security;

-- profiles: you see yourself; staff see everyone
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.fc_is_staff());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_staff_write on public.profiles for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

-- plans: public catalogue, admin-managed
create policy plans_read on public.plans for select using (true);
create policy plans_admin on public.plans for all
  using (public.fc_is_admin()) with check (public.fc_is_admin());

-- memberships
create policy memberships_read on public.memberships for select
  using (student_id = auth.uid() or public.fc_is_staff());
create policy memberships_staff on public.memberships for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

-- exercise library: any signed-in user reads, admin writes
create policy exercises_read on public.exercises for select
  using (auth.uid() is not null);
create policy exercises_admin on public.exercises for all
  using (public.fc_is_admin()) with check (public.fc_is_admin());

-- programs: student reads own published; coach manages what they wrote
create policy programs_read on public.programs for select
  using (
    (student_id = auth.uid() and status = 'published')
    or coach_id = auth.uid()
    or public.fc_is_staff()
  );
create policy programs_staff on public.programs for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

create policy program_items_read on public.program_items for select
  using (exists (
    select 1 from public.programs p
    where p.id = program_id
      and ((p.student_id = auth.uid() and p.status = 'published')
           or p.coach_id = auth.uid()
           or public.fc_is_staff())
  ));
create policy program_items_staff on public.program_items for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

-- workout logs: the student owns these, staff may read
create policy workout_logs_own on public.workout_logs for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy workout_logs_staff_read on public.workout_logs for select
  using (public.fc_is_staff());

-- nutrition
create policy diet_read on public.diet_plans for select
  using (student_id = auth.uid() or public.fc_is_staff());
create policy diet_staff on public.diet_plans for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());
create policy diet_meals_read on public.diet_meals for select
  using (exists (
    select 1 from public.diet_plans d
    where d.id = diet_plan_id
      and (d.student_id = auth.uid() or public.fc_is_staff())
  ));
create policy diet_meals_staff on public.diet_meals for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

-- requests: student creates and reads own; staff manage all
create policy requests_read on public.requests for select
  using (student_id = auth.uid() or public.fc_is_staff());
create policy requests_insert_own on public.requests for insert
  with check (student_id = auth.uid());
create policy requests_staff on public.requests for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

-- cards & check-ins are written by the door device (service role), never
-- by the student's own session.
create policy cards_read on public.cards for select
  using (student_id = auth.uid() or public.fc_is_staff());
create policy cards_admin on public.cards for all
  using (public.fc_is_admin()) with check (public.fc_is_admin());

create policy checkins_read on public.checkins for select
  using (student_id = auth.uid() or public.fc_is_staff());
create policy checkins_admin on public.checkins for all
  using (public.fc_is_admin()) with check (public.fc_is_admin());

-- settings: readable by all (the app needs the feature flags), admin writes
create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for all
  using (public.fc_is_admin()) with check (public.fc_is_admin());

-- ---------- seed: plan catalogue ----------
insert into public.plans (name, kind, price_toman, duration_days, sessions_total, perks, sort_order) values
  ('پایه',     'basic',  4000000, 30, 12,
   array['دسترسی به سالن بدنسازی', 'برنامه تمرینی پایه', 'کتابخانه ویدیوی حرکات'], 1),
  ('حرفه‌ای',  'pro',    6000000, 30, 16,
   array['همه‌ی امکانات پلن پایه', 'برنامه اختصاصی از مربی', 'برنامه غذایی با محاسبه‌ی هوشمند کالری', 'ثبت و تاریخچه‌ی وزنه'], 2),
  ('VIP',      'vip',   11000000, 30, null,
   array['ورود نامحدود', 'مربی اختصاصی، هفته‌ای ۲ جلسه', 'بازبینی برنامه هر ۱۴ روز'], 3);
