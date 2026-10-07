-- ============================================================
-- Fit Club — group classes, booking, and a waitlist that runs itself
--
-- Until now the only thing a member could reserve was a one-to-one
-- slot with a coach, through the requests table. Group classes — a
-- Tuesday HIIT, the women's spin hour, Saturday mobility — were run off
-- a sheet of paper taped to the reception desk, which meant three
-- problems the desk could not solve:
--
--   * a class "full" on paper had two empty bikes, because nobody
--     crossed their name off when they cancelled;
--   * the person who wanted the bike found out by turning up;
--   * nobody could say which classes earn their slot on the timetable.
--
-- So: sessions with a capacity, bookings with a status, and a waitlist
-- that promotes the next person the moment a seat comes free. Every
-- change of seat goes through a function that locks the session row,
-- because "count the seats, then insert" from two phones at once is how
-- a 12-bike class ends up with 13 riders.
-- ============================================================

create type booking_status as enum ('booked', 'waitlisted', 'cancelled', 'attended', 'no_show');

comment on type booking_status is
  'booked/waitlisted are live; attended/no_show are what the coach marked; cancelled frees the seat.';

-- The look of a class on the timetable. A short fixed list rather than
-- free text, so the app can give each one an icon and a colour without
-- guessing from the title.
create type class_kind as enum ('strength', 'hiit', 'cardio', 'spin', 'yoga', 'boxing', 'mobility', 'other');

create table public.class_sessions (
  id           uuid primary key default gen_random_uuid(),
  -- Sessions created together as a weekly repeat share a series id, so
  -- the timetable can be changed or cancelled as a run rather than one
  -- Tuesday at a time.
  series_id    uuid,
  title        text not null,
  description  text,
  kind         class_kind not null default 'other',
  coach_id     uuid references public.profiles (id) on delete set null,
  starts_at    timestamptz not null,
  duration_min int not null default 60,
  capacity     int not null,
  location     text,
  cancelled_at timestamptz,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),

  constraint title_sane    check (char_length(btrim(title)) between 2 and 60),
  constraint duration_sane check (duration_min between 15 and 240),
  constraint capacity_sane check (capacity between 1 and 200)
);

create index class_sessions_when on public.class_sessions (starts_at);
create index class_sessions_series on public.class_sessions (series_id);

comment on table public.class_sessions is
  'One scheduled occurrence of a group class. Capacity is enforced by book_class(), not by the client.';

create table public.class_bookings (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.class_sessions (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  status      booking_status not null,
  -- Waitlist order. Reset whenever somebody re-joins, so cancelling and
  -- re-booking cannot be used to jump the queue.
  queued_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One row per member per session. Re-booking after a cancellation
  -- updates the row instead of stacking a second one.
  unique (session_id, student_id)
);

create index class_bookings_queue on public.class_bookings (session_id, status, queued_at);
create index class_bookings_member on public.class_bookings (student_id, status);

-- Defaults the owner can change from the settings table.
insert into public.settings (key, value) values
  ('class_cancel_window_hours', '2'::jsonb),
  ('class_booking_horizon_days', '14'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- Internals — not callable from the API
-- ============================================================

-- A seat is anything that is not cancelled or waiting. A no-show still
-- held the bike for the hour, which is the point of counting it.
create or replace function public.fc_seats_taken(p_session uuid)
returns int
language sql stable set search_path = public as $$
  select count(*)::int
    from public.class_bookings
   where session_id = p_session
     and status in ('booked', 'attended', 'no_show');
$$;

-- May this member come to a class at that moment? An active
-- subscription that covers the day, with a session left to spend at
-- the door — booking a seat the turnstile will then refuse wastes it
-- for someone else.
create or replace function public.fc_has_valid_membership(p_student uuid, p_at timestamptz)
returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1
      from public.memberships m
     where m.student_id = p_student
       and m.status = 'active'
       and m.started_on <= (p_at at time zone 'Asia/Tehran')::date
       and m.expires_on >= (p_at at time zone 'Asia/Tehran')::date
       and (m.sessions_total is null or m.sessions_used < m.sessions_total)
  );
$$;

create or replace function public.fc_setting_int(p_key text, p_default int)
returns int
language sql stable set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from public.settings where key = p_key), p_default);
$$;

-- Fills free seats from the front of the queue. Skips anyone whose
-- subscription has lapsed since they joined it, rather than handing them
-- a seat the door will not honour; they stay waitlisted and the staff
-- screen shows why.
create or replace function public.promote_waitlist(p_session uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_s     public.class_sessions;
  v_taken int;
  v_row   record;
  v_moved int := 0;
begin
  select * into v_s from public.class_sessions where id = p_session for update;
  if not found or v_s.cancelled_at is not null or v_s.starts_at <= now() then
    return 0;
  end if;

  v_taken := public.fc_seats_taken(p_session);

  for v_row in
    select b.id, b.student_id
      from public.class_bookings b
     where b.session_id = p_session and b.status = 'waitlisted'
     order by b.queued_at, b.id
  loop
    exit when v_taken >= v_s.capacity;
    if public.fc_has_valid_membership(v_row.student_id, v_s.starts_at) then
      update public.class_bookings
         set status = 'booked', updated_at = now()
       where id = v_row.id;
      v_taken := v_taken + 1;
      v_moved := v_moved + 1;
    end if;
  end loop;

  return v_moved;
end;
$$;

-- The one place a seat is taken. Callers decide who the member is and
-- whether the usual rules apply; this does the locking and the counting.
create or replace function public.fc_book(p_session uuid, p_student uuid, p_force boolean)
returns booking_status
language plpgsql security definer set search_path = public as $$
declare
  v_s       public.class_sessions;
  v_current booking_status;
  v_status  booking_status;
begin
  -- The row lock is what makes the seat count trustworthy: two members
  -- booking the last bike at the same instant queue here, and the
  -- second one sees the first one's row.
  select * into v_s from public.class_sessions where id = p_session for update;
  if not found then
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

  -- Tapping "book" twice is not a second booking.
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

create or replace function public.fc_cancel(p_session uuid, p_student uuid, p_staff boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_s       public.class_sessions;
  v_current booking_status;
begin
  select * into v_s from public.class_sessions where id = p_session for update;
  if not found then
    raise exception 'class_not_found';
  end if;

  select status into v_current
    from public.class_bookings
   where session_id = p_session and student_id = p_student;

  -- Cancelling something that is not live is a no-op, not an error: the
  -- member pressed the button on a stale screen.
  if v_current is null or v_current not in ('booked', 'waitlisted') then
    return;
  end if;

  if not p_staff then
    if v_s.starts_at <= now() then
      raise exception 'class_started';
    end if;
    -- Leaving the waitlist is always free. Giving up a seat an hour
    -- before class leaves it empty, because nobody on the list can
    -- re-arrange their evening that fast — that is what the window is for.
    if v_current = 'booked'
       and v_s.starts_at - now() < make_interval(hours => public.fc_setting_int('class_cancel_window_hours', 2)) then
      raise exception 'too_late';
    end if;
  end if;

  update public.class_bookings
     set status = 'cancelled', updated_at = now()
   where session_id = p_session and student_id = p_student;

  perform public.promote_waitlist(p_session);
end;
$$;

-- Raising the capacity of a class with a queue should seat the queue,
-- without anybody having to remember to press something.
create or replace function public.class_capacity_changed()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.capacity > old.capacity then
    perform public.promote_waitlist(new.id);
  end if;
  return new;
end;
$$;

create trigger class_sessions_capacity
  after update of capacity on public.class_sessions
  for each row execute function public.class_capacity_changed();

-- ============================================================
-- The API
-- ============================================================

create or replace function public.book_class(p_session uuid)
returns booking_status
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  return public.fc_book(p_session, auth.uid(), false);
end;
$$;

create or replace function public.cancel_booking(p_session uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  perform public.fc_cancel(p_session, auth.uid(), false);
end;
$$;

-- The desk adds somebody by hand — a member on the phone, a trial
-- visitor. `p_force` seats them past a full class or a lapsed
-- subscription, which is the desk's call to make, not the app's.
create or replace function public.staff_book_class(p_session uuid, p_student uuid, p_force boolean default false)
returns booking_status
language plpgsql security definer set search_path = public as $$
begin
  if not public.fc_is_staff() then
    raise exception 'staff_only';
  end if;
  return public.fc_book(p_session, p_student, p_force);
end;
$$;

create or replace function public.staff_cancel_booking(p_session uuid, p_student uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.fc_is_staff() then
    raise exception 'staff_only';
  end if;
  perform public.fc_cancel(p_session, p_student, true);
end;
$$;

-- The coach ticks the roster. Only seats can be marked, and only from
-- half an hour before the start: marking Thursday's class as attended
-- on Monday is a mis-tap.
create or replace function public.mark_attendance(p_booking uuid, p_status booking_status)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_b public.class_bookings;
  v_s public.class_sessions;
begin
  if not public.fc_is_staff() then
    raise exception 'staff_only';
  end if;
  if p_status not in ('attended', 'no_show', 'booked') then
    raise exception 'bad_status';
  end if;

  select * into v_b from public.class_bookings where id = p_booking for update;
  if not found then
    raise exception 'booking_not_found';
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

-- Cancelling a class keeps its bookings, so the screen can tell each
-- member "this one was cancelled" rather than the class just vanishing
-- from their list.
create or replace function public.cancel_class(p_session uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.fc_is_staff() then
    raise exception 'staff_only';
  end if;
  update public.class_sessions
     set cancelled_at = coalesce(cancelled_at, now())
   where id = p_session;
end;
$$;

-- The timetable a member sees: every class in the range, how full it
-- is, and where they stand in it. Members cannot read each other's
-- bookings, so the counts come from here rather than a client-side
-- count over rows they are not allowed to see.
create or replace function public.class_schedule(p_from timestamptz, p_to timestamptz)
returns table (
  id            uuid,
  series_id     uuid,
  title         text,
  description   text,
  kind          class_kind,
  coach_id      uuid,
  coach_name    text,
  starts_at     timestamptz,
  duration_min  int,
  capacity      int,
  location      text,
  cancelled_at  timestamptz,
  booked        int,
  waitlisted    int,
  my_status     booking_status,
  my_position   int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;
  -- Two months is a timetable; more is a scrape.
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
   where s.starts_at >= p_from and s.starts_at < p_to
   order by s.starts_at, s.title;
end;
$$;

-- ============================================================
-- Row level security
-- ============================================================

alter table public.class_sessions enable row level security;
alter table public.class_bookings enable row level security;

-- The timetable is not a secret from anyone signed in. Only staff
-- write it.
create policy class_sessions_read on public.class_sessions for select
  using (auth.uid() is not null);
create policy class_sessions_staff on public.class_sessions for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

-- A member sees their own bookings; staff see the roster. Nobody writes
-- this table directly — there are no insert/update/delete policies, so
-- every seat goes through fc_book() and its row lock.
create policy class_bookings_read on public.class_bookings for select
  using (student_id = auth.uid() or public.fc_is_staff());

revoke all on public.class_sessions from anon;
revoke all on public.class_bookings from anon;
grant select, insert, update, delete on public.class_sessions to authenticated;
grant select on public.class_bookings to authenticated;
-- Supabase grants everything on new tables to the API roles by default.
-- With no write policy RLS already refuses, but the seat logic is the
-- whole point of this table, so the privilege goes too.
revoke insert, update, delete, truncate on public.class_bookings from authenticated;

-- Internals: nobody calls these over the API.
revoke execute on function public.fc_seats_taken(uuid) from public, anon, authenticated;
revoke execute on function public.fc_has_valid_membership(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.fc_setting_int(text, int) from public, anon, authenticated;
revoke execute on function public.promote_waitlist(uuid) from public, anon, authenticated;
revoke execute on function public.fc_book(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.fc_cancel(uuid, uuid, boolean) from public, anon, authenticated;
revoke execute on function public.class_capacity_changed() from public, anon, authenticated;

-- The API: signed-in callers only. Each function checks its own role.
revoke execute on function public.book_class(uuid) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.staff_book_class(uuid, uuid, boolean) from public, anon;
revoke execute on function public.staff_cancel_booking(uuid, uuid) from public, anon;
revoke execute on function public.mark_attendance(uuid, booking_status) from public, anon;
revoke execute on function public.cancel_class(uuid) from public, anon;
revoke execute on function public.class_schedule(timestamptz, timestamptz) from public, anon;

grant execute on function public.book_class(uuid) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.staff_book_class(uuid, uuid, boolean) to authenticated;
grant execute on function public.staff_cancel_booking(uuid, uuid) to authenticated;
grant execute on function public.mark_attendance(uuid, booking_status) to authenticated;
grant execute on function public.cancel_class(uuid) to authenticated;
grant execute on function public.class_schedule(timestamptz, timestamptz) to authenticated;
