-- Group classes: capacity, waitlist, cancellation window, and who may do what.
begin;

select tests.make_user('coach', 'coach');
select tests.make_user('ana');   select tests.give_membership('ana');
select tests.make_user('bob');   select tests.give_membership('bob');
select tests.make_user('cyr');   select tests.give_membership('cyr');
select tests.make_user('dan');                                -- no subscription
select tests.make_user('eve');   select tests.give_membership('eve', 12, 12);  -- sessions used up

with s as (
  insert into public.class_sessions (gym_id, title, kind, coach_id, starts_at, capacity)
  values (tests.gym(), 'HIIT', 'hiit', tests.id('coach'), now() + interval '1 day', 2) returning id)
insert into tests.ids select 'tomorrow', id from s;
with s as (
  insert into public.class_sessions (gym_id, title, kind, starts_at, capacity)
  values (tests.gym(), 'Spin', 'hiit', now() + interval '1 hour', 5) returning id)
insert into tests.ids select 'soon', id from s;
with s as (
  insert into public.class_sessions (gym_id, title, starts_at, capacity)
  values (tests.gym(), 'Yoga', now() - interval '10 minutes', 5) returning id)
insert into tests.ids select 'started', id from s;
with s as (
  insert into public.class_sessions (gym_id, title, starts_at, capacity)
  values (tests.gym(), 'Box', now() + interval '30 days', 5) returning id)
insert into tests.ids select 'far', id from s;

-- ---- booking fills seats, then the queue ----
select tests.act_as('ana');
select tests.eq(public.book_class(tests.id('tomorrow')), 'booked'::booking_status, 'ana books');
select tests.eq(public.book_class(tests.id('tomorrow')), 'booked'::booking_status, 'second tap is not a second seat');
select tests.act_as('bob');
select tests.eq(public.book_class(tests.id('tomorrow')), 'booked'::booking_status, 'bob takes the last seat');
select tests.act_as('cyr');
select tests.eq(public.book_class(tests.id('tomorrow')), 'waitlisted'::booking_status, 'cyr is queued');
select tests.eq((select my_position from public.class_schedule(now(), now() + interval '7 days') where id = tests.id('tomorrow')), 1, 'cyr is first in line');
select tests.eq((select booked from public.class_schedule(now(), now() + interval '7 days') where id = tests.id('tomorrow')), 2, 'schedule counts seats a member cannot see');
select tests.eq((select count(*)::int from public.class_bookings), 1, 'a member reads only their own booking');

-- ---- who may not book ----
select tests.act_as('dan');
select tests.expect_error($$select public.book_class(tests.id('tomorrow'))$$, 'no_membership');
select tests.act_as('eve');
select tests.expect_error($$select public.book_class(tests.id('tomorrow'))$$, 'no_membership');
select tests.act_as('ana');
select tests.expect_error($$select public.book_class(tests.id('started'))$$, 'class_started');
select tests.expect_error($$select public.book_class(tests.id('far'))$$, 'too_early');
select tests.act_as(null);
select tests.expect_error($$select public.book_class(tests.id('tomorrow'))$$, 'not_signed_in');
select tests.act_as_anon();
select tests.expect_error($$select public.book_class(tests.id('tomorrow'))$$, 'permission denied');
select tests.expect_error($$select * from public.class_sessions$$, 'permission denied');

-- ---- members cannot go around the functions ----
select tests.act_as('dan');
select tests.expect_error($$insert into public.class_bookings (session_id, student_id, status) values (tests.id('tomorrow'), tests.id('dan'), 'booked')$$, 'permission denied');
select tests.expect_error($$update public.class_bookings set status = 'booked'$$, 'permission denied');
select tests.expect_error($$insert into public.class_sessions (gym_id, title, starts_at, capacity) values (tests.gym(), 'Mine', now() + interval '1 day', 3)$$, 'row-level security');
select tests.expect_error($$select public.staff_book_class(tests.id('tomorrow'), tests.id('dan'), true)$$, 'staff_only');
select tests.expect_error($$select public.promote_waitlist(tests.id('tomorrow'))$$, 'permission denied');

-- ---- leaving the queue is free; giving up a seat promotes the queue ----
select tests.act_as('cyr');
select public.cancel_booking(tests.id('tomorrow'));
select tests.eq(public.book_class(tests.id('tomorrow')), 'waitlisted'::booking_status, 'cyr re-joins at the back');
select tests.act_as('ana');
select public.cancel_booking(tests.id('tomorrow'));
select tests.act_as_owner();
select tests.eq((select status from public.class_bookings where session_id = tests.id('tomorrow') and student_id = tests.id('cyr')), 'booked'::booking_status, 'cyr promoted when ana left');
select tests.eq(public.fc_seats_taken(tests.id('tomorrow')), 2, 'still exactly full');

-- ---- the cancellation window ----
select tests.act_as('bob');
select tests.eq(public.book_class(tests.id('soon')), 'booked'::booking_status, 'bob books the 1-hour class');
select tests.expect_error($$select public.cancel_booking(tests.id('soon'))$$, 'too_late');
select tests.act_as('coach');
select public.staff_cancel_booking(tests.id('soon'), tests.id('bob'));
select tests.act_as_owner();
select tests.eq((select status from public.class_bookings where session_id = tests.id('soon') and student_id = tests.id('bob')), 'cancelled'::booking_status, 'staff may cancel late');

-- ---- raising capacity seats the queue; a lapsed member is skipped ----
select tests.act_as_owner();
select tests.make_user('gus'); select tests.give_membership('gus');
select tests.make_user('hal'); select tests.give_membership('hal');
select tests.act_as('ana');
select tests.eq(public.book_class(tests.id('tomorrow')), 'waitlisted'::booking_status, 'ana queues behind a full class');
select tests.act_as('gus');
select tests.eq(public.book_class(tests.id('tomorrow')), 'waitlisted'::booking_status, 'gus queues second');
select tests.act_as('hal');
select tests.eq(public.book_class(tests.id('tomorrow')), 'waitlisted'::booking_status, 'hal queues third');
select tests.act_as_owner();
update public.memberships set status = 'expired' where student_id = tests.id('gus');
select tests.act_as('coach');
update public.class_sessions set capacity = 4 where id = tests.id('tomorrow');
select tests.act_as_owner();
select tests.eq((select status from public.class_bookings where session_id = tests.id('tomorrow') and student_id = tests.id('ana')), 'booked'::booking_status, 'ana seated by the bigger room');
select tests.eq((select status from public.class_bookings where session_id = tests.id('tomorrow') and student_id = tests.id('gus')), 'waitlisted'::booking_status, 'lapsed gus is skipped, not seated');
select tests.eq((select status from public.class_bookings where session_id = tests.id('tomorrow') and student_id = tests.id('hal')), 'booked'::booking_status, 'hal takes the seat gus could not');

-- ---- the desk can override; the rules still apply without the override ----
select tests.act_as('coach');
select tests.expect_error($$select public.staff_book_class(tests.id('tomorrow'), tests.id('dan'), false)$$, 'no_membership');
select tests.eq(public.staff_book_class(tests.id('tomorrow'), tests.id('dan'), true), 'booked'::booking_status, 'forced past a full class');
select tests.act_as_owner();
select tests.eq(public.fc_seats_taken(tests.id('tomorrow')), 5, 'forced seat counts');

-- ---- attendance ----
select tests.act_as_owner();
with s as (
  insert into public.class_sessions (gym_id, title, starts_at, capacity)
  values (tests.gym(), 'Core', now() + interval '10 minutes', 5) returning id)
insert into tests.ids select 'now10', id from s;
select tests.act_as('coach');
select public.staff_book_class(tests.id('now10'), tests.id('ana'), false);
select tests.act_as_owner();
insert into tests.ids select 'ana_now10', id from public.class_bookings where session_id = tests.id('now10') and student_id = tests.id('ana');
insert into tests.ids select 'ana_tomorrow', id from public.class_bookings where session_id = tests.id('tomorrow') and student_id = tests.id('ana');
select tests.act_as('ana');
select tests.expect_error($$select public.mark_attendance(tests.id('ana_now10'), 'attended')$$, 'staff_only');
select tests.act_as('coach');
select tests.expect_error($$select public.mark_attendance(tests.id('ana_tomorrow'), 'attended')$$, 'too_early');
select tests.expect_error($$select public.mark_attendance(tests.id('ana_now10'), 'cancelled')$$, 'bad_status');
select public.mark_attendance(tests.id('ana_now10'), 'attended');
select tests.act_as_owner();
select tests.eq((select status from public.class_bookings where id = tests.id('ana_now10')), 'attended'::booking_status, 'marked attended');

-- ---- a cancelled class takes no bookings ----
select tests.act_as('coach');
select public.cancel_class(tests.id('far'));
select tests.act_as('ana');
select tests.expect_error($$select public.book_class(tests.id('far'))$$, 'class_cancelled');
select tests.expect_error($$select public.cancel_class(tests.id('tomorrow'))$$, 'staff_only');
select tests.expect_error($$select * from public.class_schedule(now(), now() + interval '90 days')$$, 'range_too_wide');

-- spinning, yoga and boxing are retired: the type still has them, the table refuses them
select tests.act_as_owner();
select tests.expect_error($$insert into public.class_sessions (gym_id, title, kind, starts_at, capacity)
  values (tests.gym(), 'Spin', 'spin', now() + interval '1 day', 10)$$, 'class_kind_supported');

rollback;
