-- ============================================================
-- Fit Club — one app, many gyms
--
-- The app is sold to more than one gym, so every row now belongs to a
-- gym and staff only ever see their own. Amariya runs the platform:
-- platform admins create gyms, choose what each one gets (a CrossFit box
-- gets classes and competitions; a bodybuilding gym stays as it was),
-- and create each gym's first admin. Inside a gym nothing changes for
-- the people using it.
--
-- How rows know their gym:
--   * rows staff create on their own (plans, exercises, settings,
--     classes, announcements, leads) take the creator's gym;
--   * rows about a member (memberships, payments, programmes, logs …)
--     take the member's gym, set by a trigger — so a payment can never
--     be filed under one gym for a member of another, whoever writes it;
--   * child rows (programme items, diet meals) take their parent's.
-- Every policy that said "any staff" now says "staff of this row's gym".
--
-- Also closes a hole that predates this: profiles_update_self let a
-- signed-in member set their own role column, i.e. promote themselves to
-- admin. A trigger now refuses role, gym and username changes from
-- anyone who is not entitled to make them.
-- ============================================================

create type gym_kind as enum ('bodybuilding', 'crossfit');

create table public.gyms (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  kind            gym_kind not null default 'bodybuilding',
  -- What this gym has switched on. A bodybuilding gym gets the app as it
  -- was; a CrossFit box gets classes and competitions.
  classes_enabled boolean not null default false,
  events_enabled  boolean not null default true,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),

  constraint gym_name_sane check (char_length(btrim(name)) between 2 and 60),
  constraint gym_slug_sane check (slug ~ '^[a-z0-9-]{2,40}$')
);

create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles add column gym_id uuid references public.gyms (id) on delete restrict;
create index profiles_gym on public.profiles (gym_id, role);

-- ------------------------------------------------------------
-- Who am I, and where
-- ------------------------------------------------------------
create or replace function public.fc_gym()
returns uuid
language sql stable security definer set search_path = public as $$
  select gym_id from public.profiles where id = auth.uid();
$$;

create or replace function public.fc_is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.fc_staff_of(p_gym uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_gym is not null and exists (
    select 1 from public.profiles
     where id = auth.uid() and gym_id = p_gym and role in ('coach', 'admin')
  );
$$;

create or replace function public.fc_admin_of(p_gym uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_gym is not null and exists (
    select 1 from public.profiles
     where id = auth.uid() and gym_id = p_gym and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- The gym that already exists becomes the first tenant
-- ------------------------------------------------------------
do $$
declare
  v_gym  uuid;
  v_name text;
begin
  select coalesce(value #>> '{}', 'Fit Club') into v_name from public.settings where key = 'gym_name';
  insert into public.gyms (name, slug, kind, classes_enabled, events_enabled)
  values (coalesce(v_name, 'Fit Club'), 'fitclub', 'bodybuilding', true, true)
  returning id into v_gym;
  update public.profiles set gym_id = v_gym;
end $$;

-- ------------------------------------------------------------
-- gym_id on every tenant table
-- ------------------------------------------------------------
do $$
declare
  t text;
  v_gym uuid := (select id from public.gyms where slug = 'fitclub');
begin
  foreach t in array array[
    'plans', 'exercises', 'settings', 'class_sessions', 'announcements', 'leads',
    'memberships', 'programs', 'diet_plans', 'requests', 'cards', 'checkins',
    'body_metrics', 'payments', 'membership_freezes', 'workout_logs', 'class_bookings',
    'program_items', 'diet_meals'
  ] loop
    execute format('alter table public.%I add column gym_id uuid references public.gyms (id) on delete cascade', t);
    execute format('update public.%I set gym_id = %L', t, v_gym);
    execute format('alter table public.%I alter column gym_id set not null', t);
    execute format('create index %I on public.%I (gym_id)', t || '_gym', t);
  end loop;
end $$;

-- Settings were keyed by name alone; now by gym and name.
alter table public.settings drop constraint settings_pkey;
alter table public.settings add primary key (gym_id, key);

-- ------------------------------------------------------------
-- Triggers that set gym_id so no caller has to (or can) choose it
-- ------------------------------------------------------------

-- Rows staff create on their own: the creator's gym. A platform admin
-- has no gym and must say which one (the platform functions do).
create or replace function public.fc_gym_from_caller()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.gym_id is null then
      new.gym_id := public.fc_gym();
    end if;
  elsif new.gym_id is distinct from old.gym_id then
    raise exception 'gym_is_fixed';
  end if;
  if new.gym_id is null then
    raise exception 'no_gym';
  end if;
  return new;
end;
$$;

-- Rows about a member: the member's gym, always.
create or replace function public.fc_gym_from_student()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select gym_id into new.gym_id from public.profiles where id = new.student_id;
  if new.gym_id is null then
    raise exception 'member_has_no_gym';
  end if;
  return new;
end;
$$;

create or replace function public.fc_gym_from_program()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select gym_id into new.gym_id from public.programs where id = new.program_id;
  return new;
end;
$$;

create or replace function public.fc_gym_from_diet()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select gym_id into new.gym_id from public.diet_plans where id = new.diet_plan_id;
  return new;
end;
$$;

-- A booking is the member's, and the class must be in the same gym.
create or replace function public.fc_gym_for_booking()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select gym_id into new.gym_id from public.profiles where id = new.student_id;
  if new.gym_id is distinct from (select gym_id from public.class_sessions where id = new.session_id) then
    raise exception 'gym_mismatch';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['plans', 'exercises', 'settings', 'class_sessions', 'announcements', 'leads'] loop
    execute format('create trigger %I before insert or update on public.%I for each row execute function public.fc_gym_from_caller()', t || '_gym', t);
  end loop;
  foreach t in array array['memberships', 'programs', 'diet_plans', 'requests', 'cards', 'checkins',
                           'body_metrics', 'payments', 'membership_freezes', 'workout_logs'] loop
    execute format('create trigger %I before insert or update of student_id, gym_id on public.%I for each row execute function public.fc_gym_from_student()', t || '_gym', t);
  end loop;
end $$;

create trigger program_items_gym before insert or update of program_id, gym_id on public.program_items
  for each row execute function public.fc_gym_from_program();
create trigger diet_meals_gym before insert or update of diet_plan_id, gym_id on public.diet_meals
  for each row execute function public.fc_gym_from_diet();
create trigger class_bookings_gym before insert or update of student_id, session_id, gym_id on public.class_bookings
  for each row execute function public.fc_gym_for_booking();

-- ------------------------------------------------------------
-- Nobody promotes themselves, and nobody moves between gyms
-- ------------------------------------------------------------
create or replace function public.fc_guard_profile()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Definer functions and the database owner (migrations, the platform
  -- functions) run without a signed-in user; they are trusted here.
  if auth.uid() is null or public.fc_is_platform_admin() then
    return new;
  end if;
  if new.gym_id is distinct from old.gym_id then
    raise exception 'gym_is_fixed';
  end if;
  if (new.role is distinct from old.role or new.username is distinct from old.username)
     and not public.fc_admin_of(old.gym_id) then
    raise exception 'not_allowed';
  end if;
  -- An admin cannot demote themselves into a gym with no admin by accident
  -- through this path either; role changes are for other people.
  if new.role is distinct from old.role and new.id = auth.uid() then
    raise exception 'not_allowed';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.fc_guard_profile();

-- ------------------------------------------------------------
-- Policies: "any staff" becomes "staff of this row's gym"
-- ------------------------------------------------------------
drop policy profiles_select on public.profiles;
drop policy profiles_read_staff on public.profiles;
drop policy profiles_staff_write on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.fc_staff_of(gym_id));
create policy profiles_read_staff on public.profiles for select
  using (auth.uid() is not null and role in ('coach', 'admin') and gym_id = public.fc_gym());
create policy profiles_staff_write on public.profiles for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

-- The price list was public to anyone; with several gyms that would
-- list every gym's prices to every member. Each gym sees its own.
drop policy plans_read on public.plans;
create policy plans_read on public.plans for select
  using (gym_id = public.fc_gym());
drop policy plans_admin on public.plans;
create policy plans_admin on public.plans for all
  using (public.fc_admin_of(gym_id)) with check (public.fc_admin_of(gym_id));

drop policy exercises_read on public.exercises;
drop policy exercises_admin on public.exercises;
create policy exercises_read on public.exercises for select
  using (gym_id = public.fc_gym());
create policy exercises_admin on public.exercises for all
  using (public.fc_admin_of(gym_id)) with check (public.fc_admin_of(gym_id));

drop policy memberships_read on public.memberships;
drop policy memberships_staff on public.memberships;
create policy memberships_read on public.memberships for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy memberships_staff on public.memberships for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy programs_read on public.programs;
drop policy programs_staff on public.programs;
create policy programs_read on public.programs for select
  using ((student_id = auth.uid() and status in ('published', 'archived')) or public.fc_staff_of(gym_id));
create policy programs_staff on public.programs for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy program_items_read on public.program_items;
drop policy program_items_staff on public.program_items;
create policy program_items_read on public.program_items for select
  using (
    public.fc_staff_of(gym_id)
    or exists (select 1 from public.programs p
                where p.id = program_id and p.student_id = auth.uid()
                  and p.status in ('published', 'archived'))
  );
create policy program_items_staff on public.program_items for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy workout_logs_staff_read on public.workout_logs;
create policy workout_logs_staff_read on public.workout_logs for select
  using (public.fc_staff_of(gym_id));

drop policy diet_read on public.diet_plans;
drop policy diet_staff on public.diet_plans;
create policy diet_read on public.diet_plans for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy diet_staff on public.diet_plans for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy diet_meals_read on public.diet_meals;
drop policy diet_meals_staff on public.diet_meals;
create policy diet_meals_read on public.diet_meals for select
  using (
    public.fc_staff_of(gym_id)
    or exists (select 1 from public.diet_plans d where d.id = diet_plan_id and d.student_id = auth.uid())
  );
create policy diet_meals_staff on public.diet_meals for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy requests_read on public.requests;
drop policy requests_staff on public.requests;
create policy requests_read on public.requests for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy requests_staff on public.requests for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy cards_read on public.cards;
drop policy cards_admin on public.cards;
create policy cards_read on public.cards for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy cards_admin on public.cards for all
  using (public.fc_admin_of(gym_id)) with check (public.fc_admin_of(gym_id));

drop policy checkins_read on public.checkins;
drop policy checkins_admin on public.checkins;
create policy checkins_read on public.checkins for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy checkins_admin on public.checkins for all
  using (public.fc_admin_of(gym_id)) with check (public.fc_admin_of(gym_id));

-- Settings stay readable (gym name and photo show on the login page),
-- but only a gym's admin writes its own.
drop policy settings_admin on public.settings;
create policy settings_admin on public.settings for all
  using (public.fc_admin_of(gym_id)) with check (public.fc_admin_of(gym_id));

drop policy body_metrics_read on public.body_metrics;
drop policy body_metrics_staff on public.body_metrics;
create policy body_metrics_read on public.body_metrics for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy body_metrics_staff on public.body_metrics for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy payments_read on public.payments;
drop policy payments_staff on public.payments;
create policy payments_read on public.payments for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy payments_staff on public.payments for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy membership_freezes_read on public.membership_freezes;
create policy membership_freezes_read on public.membership_freezes for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));

drop policy class_sessions_read on public.class_sessions;
drop policy class_sessions_staff on public.class_sessions;
create policy class_sessions_read on public.class_sessions for select
  using (gym_id = public.fc_gym());
create policy class_sessions_staff on public.class_sessions for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

drop policy class_bookings_read on public.class_bookings;
create policy class_bookings_read on public.class_bookings for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));

drop policy announcements_read on public.announcements;
drop policy announcements_admin on public.announcements;
create policy announcements_read on public.announcements for select
  using (
    public.fc_staff_of(gym_id)
    or (
      gym_id = public.fc_gym()
      and publish_from <= (now() at time zone 'Asia/Tehran')::date
      and (publish_until is null or publish_until >= (now() at time zone 'Asia/Tehran')::date)
    )
  );
create policy announcements_admin on public.announcements for all
  using (public.fc_admin_of(gym_id)) with check (public.fc_admin_of(gym_id));

drop policy leads_staff on public.leads;
create policy leads_staff on public.leads for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

alter table public.gyms enable row level security;
alter table public.platform_admins enable row level security;

-- A gym's name, kind and switches are not secret: the login page shows
-- the name, and every screen reads the switches.
create policy gyms_read on public.gyms for select using (true);

revoke insert, update, delete, truncate on public.gyms from anon, authenticated;
revoke all on public.platform_admins from anon, authenticated;

-- ------------------------------------------------------------
-- Settings and the functions that read them are per gym now
-- ------------------------------------------------------------
create or replace function public.fc_setting_int(p_key text, p_default int)
returns int
language sql stable set search_path = public as $$
  select coalesce(
    (select (value #>> '{}')::int from public.settings where key = p_key and gym_id = public.fc_gym()),
    p_default);
$$;

-- The door: the module switch is the card holder's gym's switch.
create or replace function public.record_tap(p_card_uid text)
returns table (
  result       tap_result,
  student_name text,
  sessions_left int,
  days_left    int
)
language plpgsql security definer set search_path = public as $$
declare
  v_enabled   boolean;
  v_card      public.cards%rowtype;
  v_profile   public.profiles%rowtype;
  v_mem       public.memberships%rowtype;
  v_left      int;
  v_last_kind checkin_kind;
  v_last_at   timestamptz;
  v_decision  record;
begin
  select * into v_card from public.cards
    where uid = p_card_uid and active limit 1;

  if not found then
    return query select 'unknown_card'::tap_result, null::text, null::int, null::int;
    return;
  end if;

  select (value)::boolean into v_enabled
    from public.settings where key = 'checkin_module_enabled' and gym_id = v_card.gym_id;

  if not coalesce(v_enabled, false) then
    return query select 'module_off'::tap_result, null::text, null::int, null::int;
    return;
  end if;

  select * into v_profile from public.profiles where id = v_card.student_id;

  select * into v_mem from public.memberships
    where student_id = v_card.student_id and status = 'active'
    order by expires_on desc limit 1;

  if not found then
    return query select 'no_membership'::tap_result, v_profile.full_name, null::int, null::int;
    return;
  end if;

  if v_mem.expires_on < current_date then
    update public.memberships set status = 'expired' where id = v_mem.id;
    return query select 'expired'::tap_result, v_profile.full_name, null::int, 0;
    return;
  end if;

  v_left := public.sessions_left(v_mem);

  select kind, at into v_last_kind, v_last_at
    from public.checkins
    where student_id = v_card.student_id
    order by at desc limit 1;

  select * into v_decision from public.decide_tap(v_last_kind, v_last_at, v_left);

  if v_decision.deduct and v_left is not null and v_left <= 0 then
    return query select 'no_sessions'::tap_result, v_profile.full_name, 0,
                        (v_mem.expires_on - current_date);
    return;
  end if;

  insert into public.checkins (student_id, membership_id, card_id, kind, deducted)
  values (v_card.student_id, v_mem.id, v_card.id, v_decision.kind, v_decision.deduct);

  if v_decision.deduct then
    update public.memberships
      set sessions_used = sessions_used + 1
      where id = v_mem.id
      returning public.sessions_left(memberships.*) into v_left;
  end if;

  return query select
    case
      when v_decision.kind = 'out' then 'exited'::tap_result
      when v_decision.deduct       then 'entered'::tap_result
      else 'entered_no_deduct'::tap_result
    end,
    v_profile.full_name,
    v_left,
    (v_mem.expires_on - current_date);
end;
$$;
revoke execute on function public.record_tap(text) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Accounts: a gym admin creates people in their own gym; a platform
-- admin creates them in any gym (and is the only way a new gym gets
-- its first admin).
-- ------------------------------------------------------------
create or replace function public.admin_create_user(
  p_username  text,
  p_password  text,
  p_full_name text,
  p_role      user_role default 'student',
  p_gym       uuid default null
)
returns uuid
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_id    uuid := gen_random_uuid();
  v_name  text := lower(trim(p_username));
  v_email text;
  v_gym   uuid;
begin
  if public.fc_is_platform_admin() then
    v_gym := p_gym;
    if v_gym is null or not exists (select 1 from public.gyms where id = v_gym) then
      raise exception 'gym_required' using errcode = '22023';
    end if;
  else
    v_gym := public.fc_gym();
    if not public.fc_admin_of(v_gym) then
      raise exception 'only an admin may create accounts' using errcode = '42501';
    end if;
    if p_gym is not null and p_gym <> v_gym then
      raise exception 'only an admin may create accounts' using errcode = '42501';
    end if;
  end if;

  if v_name !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'username must be 3-32 characters of a-z, 0-9 or underscore'
      using errcode = '22023';
  end if;
  if length(p_password) < 8 then
    raise exception 'password must be at least 8 characters' using errcode = '22023';
  end if;

  v_email := v_name || '@fitclub.invalid';
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'that username is taken' using errcode = '23505';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id,
    'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(nullif(trim(p_full_name), ''), v_name)),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', v_email, now(), now()
  );

  -- The guard trigger lets this through: it runs as the definer with the
  -- caller's identity, and the caller is an admin of this gym or the
  -- platform. Setting gym_id on a profile that has none is not a move.
  update public.profiles
     set username  = v_name,
         full_name = coalesce(nullif(trim(p_full_name), ''), v_name),
         role      = p_role,
         gym_id    = v_gym
   where id = v_id;

  return v_id;
end;
$$;

create or replace function public.admin_set_password(p_user_id uuid, p_password text)
returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_gym uuid := (select gym_id from public.profiles where id = p_user_id);
begin
  if not (public.fc_is_platform_admin() or public.fc_admin_of(v_gym)) then
    raise exception 'only an admin may reset passwords' using errcode = '42501';
  end if;
  -- A gym admin cannot reset the platform's own accounts.
  if not public.fc_is_platform_admin() and exists (select 1 from public.platform_admins where user_id = p_user_id) then
    raise exception 'only an admin may reset passwords' using errcode = '42501';
  end if;
  if length(p_password) < 8 then
    raise exception 'password must be at least 8 characters' using errcode = '22023';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at         = now()
   where id = p_user_id;
  if not found then
    raise exception 'no such account' using errcode = 'P0002';
  end if;
end;
$$;

-- The old four-argument signature stays (dropping it on the live project
-- needed a confirmation step the migration tooling could not give), but
-- it now hands straight to the gym-aware version, so either one enforces
-- the same rules. Callers pass p_gym explicitly to pick the new one.
create or replace function public.admin_create_user(
  p_username  text,
  p_password  text,
  p_full_name text,
  p_role      user_role default 'student'
)
returns uuid
language sql security definer set search_path = public as $$
  select public.admin_create_user(p_username, p_password, p_full_name, p_role, null::uuid);
$$;
revoke execute on function public.admin_create_user(text, text, text, user_role) from public, anon;
grant execute on function public.admin_create_user(text, text, text, user_role) to authenticated;

-- Revoking from anon alone left the PUBLIC grant in place, which is what
-- the security advisor kept reporting.
revoke execute on function public.admin_create_user(text, text, text, user_role, uuid) from public, anon;
revoke execute on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_create_user(text, text, text, user_role, uuid) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;

-- The new profile from admin_create_user has gym_id null until the
-- update above; the guard must allow null -> a gym from a definer path.
create or replace function public.fc_guard_profile()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.fc_is_platform_admin() then
    return new;
  end if;
  if old.gym_id is not null and new.gym_id is distinct from old.gym_id then
    raise exception 'gym_is_fixed';
  end if;
  if old.gym_id is null and new.gym_id is not null and not public.fc_admin_of(new.gym_id) then
    raise exception 'gym_is_fixed';
  end if;
  if (new.role is distinct from old.role or new.username is distinct from old.username)
     and not public.fc_admin_of(coalesce(old.gym_id, new.gym_id)) then
    raise exception 'not_allowed';
  end if;
  if new.role is distinct from old.role and new.id = auth.uid() then
    raise exception 'not_allowed';
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Classes and freezes: same rules, now within a gym
-- ------------------------------------------------------------
create or replace function public.fc_book(p_session uuid, p_student uuid, p_force boolean)
returns booking_status
language plpgsql security definer set search_path = public as $$
declare
  v_s       public.class_sessions;
  v_current booking_status;
  v_status  booking_status;
begin
  select * into v_s from public.class_sessions where id = p_session for update;
  -- Another gym's class reads as no class at all.
  if not found or v_s.gym_id is distinct from (select gym_id from public.profiles where id = p_student) then
    raise exception 'class_not_found';
  end if;
  if v_s.cancelled_at is not null then
    raise exception 'class_cancelled';
  end if;
  if v_s.starts_at <= now() then
    raise exception 'class_started';
  end if;
  if not p_force then
    if v_s.starts_at > now() + make_interval(days => public.fc_setting_int('class_booking_horizon_days', 14)) then
      raise exception 'too_early';
    end if;
    if not public.fc_has_valid_membership(p_student, v_s.starts_at) then
      raise exception 'no_membership';
    end if;
  end if;
  select status into v_current
    from public.class_bookings
   where session_id = p_session and student_id = p_student;
  if v_current in ('booked', 'waitlisted', 'attended', 'no_show') then
    return v_current;
  end if;
  v_status := case
    when p_force or public.fc_seats_taken(p_session) < v_s.capacity then 'booked'
    else 'waitlisted'
  end;
  insert into public.class_bookings (session_id, student_id, status, queued_at, updated_at)
  values (p_session, p_student, v_status, now(), now())
  on conflict (session_id, student_id) do update
    set status = excluded.status, queued_at = now(), updated_at = now();
  return v_status;
end;
$$;

create or replace function public.fc_session_gym(p_session uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select gym_id from public.class_sessions where id = p_session;
$$;
revoke execute on function public.fc_session_gym(uuid) from public, anon, authenticated;

create or replace function public.staff_book_class(p_session uuid, p_student uuid, p_force boolean default false)
returns booking_status
language plpgsql security definer set search_path = public as $$
begin
  if not public.fc_staff_of(public.fc_session_gym(p_session)) then
    raise exception 'staff_only';
  end if;
  return public.fc_book(p_session, p_student, p_force);
end;
$$;

create or replace function public.staff_cancel_booking(p_session uuid, p_student uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.fc_staff_of(public.fc_session_gym(p_session)) then
    raise exception 'staff_only';
  end if;
  perform public.fc_cancel(p_session, p_student, true);
end;
$$;

create or replace function public.mark_attendance(p_booking uuid, p_status booking_status)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_b public.class_bookings;
  v_s public.class_sessions;
begin
  select * into v_b from public.class_bookings where id = p_booking for update;
  if not found then
    raise exception 'booking_not_found';
  end if;
  if not public.fc_staff_of(v_b.gym_id) then
    raise exception 'staff_only';
  end if;
  if p_status not in ('attended', 'no_show', 'booked') then
    raise exception 'bad_status';
  end if;
  if v_b.status not in ('booked', 'attended', 'no_show') then
    raise exception 'not_a_seat';
  end if;
  select * into v_s from public.class_sessions where id = v_b.session_id;
  if v_s.starts_at - now() > interval '30 minutes' then
    raise exception 'too_early';
  end if;
  update public.class_bookings
     set status = p_status, updated_at = now()
   where id = p_booking;
end;
$$;

create or replace function public.cancel_class(p_session uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.fc_staff_of(public.fc_session_gym(p_session)) then
    raise exception 'staff_only';
  end if;
  update public.class_sessions
     set cancelled_at = coalesce(cancelled_at, now())
   where id = p_session;
end;
$$;

create or replace function public.class_schedule(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid, series_id uuid, title text, description text, kind class_kind,
  coach_id uuid, coach_name text, starts_at timestamptz, duration_min int,
  capacity int, location text, cancelled_at timestamptz, booked int,
  waitlisted int, my_status booking_status, my_position int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  if p_to - p_from > interval '62 days' then
    raise exception 'range_too_wide';
  end if;
  return query
  select s.id, s.series_id, s.title, s.description, s.kind, s.coach_id,
         c.full_name,
         s.starts_at, s.duration_min, s.capacity, s.location, s.cancelled_at,
         public.fc_seats_taken(s.id),
         (select count(*)::int from public.class_bookings w
           where w.session_id = s.id and w.status = 'waitlisted'),
         mine.status,
         case when mine.status = 'waitlisted' then
           (select count(*)::int from public.class_bookings w
             where w.session_id = s.id and w.status = 'waitlisted'
               and (w.queued_at, w.id) <= (mine.queued_at, mine.id))
         end
    from public.class_sessions s
    left join public.profiles c on c.id = s.coach_id
    left join public.class_bookings mine
           on mine.session_id = s.id and mine.student_id = auth.uid()
   where s.gym_id = public.fc_gym()
     and s.starts_at >= p_from and s.starts_at < p_to
   order by s.starts_at, s.title;
end;
$$;

create or replace function public.freeze_membership(p_membership uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_m public.memberships;
begin
  select * into v_m from public.memberships where id = p_membership for update;
  if not found then
    raise exception 'membership_not_found';
  end if;
  if not public.fc_staff_of(v_m.gym_id) then
    raise exception 'staff_only';
  end if;
  if v_m.status = 'frozen' then
    raise exception 'already_frozen';
  end if;
  if v_m.status <> 'active' or v_m.expires_on < public.fc_today() then
    raise exception 'not_active';
  end if;
  update public.memberships set status = 'frozen' where id = p_membership;
  insert into public.membership_freezes (membership_id, student_id, started_on, reason, created_by)
  values (p_membership, v_m.student_id, public.fc_today(), nullif(btrim(p_reason), ''), auth.uid());
end;
$$;

create or replace function public.thaw_membership(p_membership uuid)
returns date
language plpgsql security definer set search_path = public as $$
declare
  v_m       public.memberships;
  v_f       public.membership_freezes;
  v_used    int;
  v_days    int;
  v_credit  int;
  v_expires date;
begin
  select * into v_m from public.memberships where id = p_membership for update;
  if not found then
    raise exception 'membership_not_found';
  end if;
  if not public.fc_staff_of(v_m.gym_id) then
    raise exception 'staff_only';
  end if;
  if v_m.status <> 'frozen' then
    raise exception 'not_frozen';
  end if;
  select * into v_f from public.membership_freezes
   where membership_id = p_membership and ended_on is null
   for update;
  if not found then
    update public.memberships set status = 'active' where id = p_membership;
    return v_m.expires_on;
  end if;
  select coalesce(sum(days_credited), 0) into v_used
    from public.membership_freezes
   where membership_id = p_membership and ended_on is not null;
  v_days   := greatest(0, public.fc_today() - v_f.started_on);
  v_credit := least(v_days, greatest(0, public.fc_setting_int('freeze_max_days', 60) - v_used));
  v_expires := v_m.expires_on + v_credit;
  update public.membership_freezes
     set ended_on = public.fc_today(), days_credited = v_credit
   where id = v_f.id;
  update public.memberships
     set expires_on = v_expires,
         status = case when v_expires >= public.fc_today() then 'active' else 'expired' end::member_status
   where id = p_membership;
  return v_expires;
end;
$$;

-- ------------------------------------------------------------
-- The platform
-- ------------------------------------------------------------

-- A new gym starts with the first gym's price list, exercise library and
-- settings as a template, so its admin edits rather than types from zero.
create or replace function public.platform_create_gym(
  p_name    text,
  p_slug    text,
  p_kind    gym_kind,
  p_classes boolean default null,
  p_events  boolean default true
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_gym      uuid;
  v_template uuid := (select id from public.gyms order by created_at limit 1);
begin
  if not public.fc_is_platform_admin() then
    raise exception 'platform_only';
  end if;
  insert into public.gyms (name, slug, kind, classes_enabled, events_enabled)
  values (btrim(p_name), lower(btrim(p_slug)), p_kind,
          coalesce(p_classes, p_kind = 'crossfit'), coalesce(p_events, true))
  returning id into v_gym;

  if v_template is not null then
    insert into public.plans (gym_id, name, kind, price_toman, duration_days, sessions_total, perks, is_active, sort_order)
    select v_gym, name, kind, price_toman, duration_days, sessions_total, perks, is_active, sort_order
      from public.plans where gym_id = v_template and is_active;
    insert into public.exercises (gym_id, name, muscle_group, level, video_path, thumb_path, duration_seconds, instructions)
    select v_gym, name, muscle_group, level, video_path, thumb_path, duration_seconds, instructions
      from public.exercises where gym_id = v_template;
    insert into public.settings (gym_id, key, value)
    select v_gym, key, case when key = 'gym_name' then to_jsonb(btrim(p_name)) else value end
      from public.settings where gym_id = v_template;
  end if;
  return v_gym;
end;
$$;

create or replace function public.platform_update_gym(
  p_gym     uuid,
  p_name    text,
  p_kind    gym_kind,
  p_classes boolean,
  p_events  boolean,
  p_active  boolean
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.fc_is_platform_admin() then
    raise exception 'platform_only';
  end if;
  update public.gyms
     set name = btrim(p_name), kind = p_kind, classes_enabled = p_classes,
         events_enabled = p_events, is_active = p_active
   where id = p_gym;
  update public.settings set value = to_jsonb(btrim(p_name)), updated_at = now()
   where gym_id = p_gym and key = 'gym_name';
end;
$$;

-- One row per gym with the figures the platform owner cares about.
create or replace function public.platform_gyms()
returns table (
  id uuid, name text, slug text, kind gym_kind, classes_enabled boolean,
  events_enabled boolean, is_active boolean, created_at timestamptz,
  members int, staff int, active_memberships int, revenue_30d bigint
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.fc_is_platform_admin() then
    raise exception 'platform_only';
  end if;
  return query
  select g.id, g.name, g.slug, g.kind, g.classes_enabled, g.events_enabled, g.is_active, g.created_at,
         (select count(*)::int from public.profiles p where p.gym_id = g.id and p.role = 'student'),
         (select count(*)::int from public.profiles p where p.gym_id = g.id and p.role in ('coach', 'admin')),
         (select count(*)::int from public.memberships m where m.gym_id = g.id and m.status = 'active' and m.expires_on >= current_date),
         (select coalesce(sum(amount_toman), 0)::bigint from public.payments pay where pay.gym_id = g.id and pay.paid_at >= now() - interval '30 days')
    from public.gyms g
   order by g.created_at;
end;
$$;

-- Internals and triggers: not callable over the API.
revoke execute on function public.fc_gym_from_caller() from public, anon, authenticated;
revoke execute on function public.fc_gym_from_student() from public, anon, authenticated;
revoke execute on function public.fc_gym_from_program() from public, anon, authenticated;
revoke execute on function public.fc_gym_from_diet() from public, anon, authenticated;
revoke execute on function public.fc_gym_for_booking() from public, anon, authenticated;
revoke execute on function public.fc_guard_profile() from public, anon, authenticated;

-- Used inside RLS policies, so signed-in users keep EXECUTE (as with
-- fc_is_staff in 0003). Each returns only facts about the caller.
revoke execute on function public.fc_gym() from public, anon;
revoke execute on function public.fc_is_platform_admin() from public, anon;
revoke execute on function public.fc_staff_of(uuid) from public, anon;
revoke execute on function public.fc_admin_of(uuid) from public, anon;
grant execute on function public.fc_gym() to authenticated;
grant execute on function public.fc_is_platform_admin() to authenticated;
grant execute on function public.fc_staff_of(uuid) to authenticated;
grant execute on function public.fc_admin_of(uuid) to authenticated;

revoke execute on function public.platform_create_gym(text, text, gym_kind, boolean, boolean) from public, anon;
revoke execute on function public.platform_update_gym(uuid, text, gym_kind, boolean, boolean, boolean) from public, anon;
revoke execute on function public.platform_gyms() from public, anon;
grant execute on function public.platform_create_gym(text, text, gym_kind, boolean, boolean) to authenticated;
grant execute on function public.platform_update_gym(uuid, text, gym_kind, boolean, boolean, boolean) to authenticated;
grant execute on function public.platform_gyms() to authenticated;
