-- ============================================================
-- Fit Club — tournaments and events
--
-- A gym runs more than classes: an in-house CrossFit throwdown, a
-- deadlift day, a 5 km run, a cycling race, or a night watching the
-- football by the pool. The admin puts it on, members sign up from the
-- app, and for a competition the coach enters scores and the app ranks
-- them — per division, the right way round (fastest time wins, most
-- reps wins).
-- ============================================================

create type event_kind as enum (
  'crossfit', 'weightlifting', 'powerlifting', 'bodybuilding',
  'running', 'cycling', 'social', 'other'
);
create type event_status as enum ('draft', 'published', 'finished', 'cancelled');
create type score_kind as enum ('none', 'reps', 'time', 'weight', 'distance', 'points');
create type event_reg_status as enum ('registered', 'cancelled', 'attended');

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  gym_id           uuid not null references public.gyms (id) on delete cascade,
  title            text not null,
  description      text,
  kind             event_kind not null default 'other',
  -- A competition is scored and ranked; an event is just attended.
  is_competition   boolean not null default true,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  location         text,
  capacity         int,
  register_until   timestamptz,
  fee_toman        bigint,
  -- RX / Scaled, men / women, age groups: whatever the gym ranks by.
  divisions        text[] not null default '{}',
  score_kind       score_kind not null default 'none',
  -- Time is better when lower; reps, kilos and points when higher.
  lower_is_better  boolean not null default false,
  status           event_status not null default 'published',
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),

  constraint event_title_sane check (char_length(btrim(title)) between 2 and 80),
  constraint event_desc_short check (description is null or char_length(description) <= 1000),
  constraint event_capacity   check (capacity is null or capacity between 1 and 1000),
  constraint event_fee        check (fee_toman is null or fee_toman >= 0),
  constraint event_window     check (ends_at is null or ends_at >= starts_at),
  constraint event_divisions  check (cardinality(divisions) <= 8)
);
create index events_when on public.events (gym_id, starts_at);

create trigger events_gym before insert or update on public.events
  for each row execute function public.fc_gym_from_caller();

create table public.event_registrations (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  division    text,
  status      event_reg_status not null default 'registered',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_id, student_id)
);
create index event_registrations_event on public.event_registrations (event_id, status);

create table public.event_results (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  gym_id      uuid not null references public.gyms (id) on delete cascade,
  division    text,
  score       numeric(10, 2) not null,
  note        text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (event_id, student_id),
  constraint result_note_short check (note is null or char_length(note) <= 200)
);

-- Both belong to the member, and the event must be in the member's gym.
create or replace function public.fc_gym_for_event_row()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select gym_id into new.gym_id from public.profiles where id = new.student_id;
  if new.gym_id is distinct from (select gym_id from public.events where id = new.event_id) then
    raise exception 'gym_mismatch';
  end if;
  return new;
end;
$$;

create trigger event_registrations_gym before insert or update on public.event_registrations
  for each row execute function public.fc_gym_for_event_row();
create trigger event_results_gym before insert or update on public.event_results
  for each row execute function public.fc_gym_for_event_row();

-- ------------------------------------------------------------
-- Signing up
-- ------------------------------------------------------------
create or replace function public.register_event(p_event uuid, p_division text default null)
returns event_reg_status
language plpgsql security definer set search_path = public as $$
declare
  v_e     public.events;
  v_count int;
  v_div   text := nullif(btrim(p_division), '');
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_e from public.events where id = p_event for update;
  if not found or v_e.gym_id is distinct from public.fc_gym() or v_e.status = 'draft' then
    raise exception 'event_not_found';
  end if;
  if v_e.status <> 'published' then
    raise exception 'event_closed';
  end if;
  if v_e.starts_at <= now() or (v_e.register_until is not null and v_e.register_until < now()) then
    raise exception 'registration_closed';
  end if;
  if cardinality(v_e.divisions) > 0 and (v_div is null or not v_div = any (v_e.divisions)) then
    raise exception 'pick_division';
  end if;
  if cardinality(v_e.divisions) = 0 then
    v_div := null;
  end if;

  if exists (select 1 from public.event_registrations
              where event_id = p_event and student_id = auth.uid() and status = 'registered') then
    update public.event_registrations set division = v_div, updated_at = now()
     where event_id = p_event and student_id = auth.uid();
    return 'registered';
  end if;

  select count(*) into v_count from public.event_registrations
   where event_id = p_event and status in ('registered', 'attended');
  if v_e.capacity is not null and v_count >= v_e.capacity then
    raise exception 'event_full';
  end if;

  insert into public.event_registrations (event_id, student_id, division, status)
  values (p_event, auth.uid(), v_div, 'registered')
  on conflict (event_id, student_id) do update
    set status = 'registered', division = excluded.division, updated_at = now();
  return 'registered';
end;
$$;

create or replace function public.cancel_event_registration(p_event uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_e public.events;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  select * into v_e from public.events where id = p_event;
  if not found or v_e.gym_id is distinct from public.fc_gym() then
    raise exception 'event_not_found';
  end if;
  if v_e.starts_at <= now() then
    raise exception 'event_started';
  end if;
  update public.event_registrations set status = 'cancelled', updated_at = now()
   where event_id = p_event and student_id = auth.uid() and status = 'registered';
end;
$$;

-- What a member sees: the gym's events from a date on, with how many
-- have signed up and where they stand.
create or replace function public.event_list(p_from timestamptz)
returns table (
  id uuid, title text, description text, kind event_kind, is_competition boolean,
  starts_at timestamptz, ends_at timestamptz, location text, capacity int,
  register_until timestamptz, fee_toman bigint, divisions text[], score_kind score_kind,
  lower_is_better boolean, status event_status, registered int, results int,
  my_status event_reg_status, my_division text
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  return query
  select e.id, e.title, e.description, e.kind, e.is_competition, e.starts_at, e.ends_at,
         e.location, e.capacity, e.register_until, e.fee_toman, e.divisions, e.score_kind,
         e.lower_is_better, e.status,
         (select count(*)::int from public.event_registrations r
           where r.event_id = e.id and r.status in ('registered', 'attended')),
         (select count(*)::int from public.event_results x where x.event_id = e.id),
         mine.status, mine.division
    from public.events e
    left join public.event_registrations mine on mine.event_id = e.id and mine.student_id = auth.uid()
   where e.gym_id = public.fc_gym()
     and (e.status <> 'draft' or public.fc_staff_of(e.gym_id))
     and coalesce(e.ends_at, e.starts_at) >= p_from
   order by e.starts_at;
end;
$$;

-- The ranking, per division, the right way round. Names are shown to
-- everyone in the gym: a leaderboard with no names is not one.
create or replace function public.event_leaderboard(p_event uuid)
returns table (place int, student_id uuid, name text, division text, score numeric, note text, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_e public.events;
begin
  select * into v_e from public.events where id = p_event;
  if not found or v_e.gym_id is distinct from public.fc_gym()
     or (v_e.status = 'draft' and not public.fc_staff_of(v_e.gym_id)) then
    raise exception 'event_not_found';
  end if;
  return query
  select (rank() over (
            partition by x.division
            order by case when v_e.lower_is_better then x.score end asc,
                     case when not v_e.lower_is_better then x.score end desc))::int,
         x.student_id, p.full_name, x.division, x.score, x.note, x.student_id = auth.uid()
    from public.event_results x
    join public.profiles p on p.id = x.student_id
   where x.event_id = p_event
   order by x.division nulls first, 1;
end;
$$;

-- ------------------------------------------------------------
-- Row level security
-- ------------------------------------------------------------
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_results enable row level security;

create policy events_read on public.events for select
  using (gym_id = public.fc_gym() and (status <> 'draft' or public.fc_staff_of(gym_id)));
create policy events_staff on public.events for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

create policy event_registrations_read on public.event_registrations for select
  using (student_id = auth.uid() or public.fc_staff_of(gym_id));
create policy event_registrations_staff on public.event_registrations for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

create policy event_results_read on public.event_results for select
  using (gym_id = public.fc_gym());
create policy event_results_staff on public.event_results for all
  using (public.fc_staff_of(gym_id)) with check (public.fc_staff_of(gym_id));

revoke all on public.events, public.event_registrations, public.event_results from anon;
grant select, insert, update, delete on public.events, public.event_registrations, public.event_results to authenticated;

revoke execute on function public.fc_gym_for_event_row() from public, anon, authenticated;
revoke execute on function public.register_event(uuid, text) from public, anon;
revoke execute on function public.cancel_event_registration(uuid) from public, anon;
revoke execute on function public.event_list(timestamptz) from public, anon;
revoke execute on function public.event_leaderboard(uuid) from public, anon;
grant execute on function public.register_event(uuid, text) to authenticated;
grant execute on function public.cancel_event_registration(uuid) to authenticated;
grant execute on function public.event_list(timestamptz) to authenticated;
grant execute on function public.event_leaderboard(uuid) to authenticated;
