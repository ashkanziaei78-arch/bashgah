-- Tournaments: sign-up rules, capacity, divisions, ranking, gym isolation.
begin;
select tests.make_user('host', 'admin');
select tests.make_user('ath1');
select tests.make_user('ath2');
select tests.make_user('ath3');
select tests.make_user('ath4');
select tests.make_user('root', 'admin');
update public.profiles set gym_id = null where id = tests.id('root');
insert into public.platform_admins values (tests.id('root'));
select tests.act_as('root');
select public.platform_create_gym('دیگر', 'other', 'crossfit');
select tests.act_as_owner();
select tests.make_user('outsider', 'student', 'other');

select tests.act_as('host');
with e as (insert into public.events (title, kind, starts_at, capacity, divisions, score_kind, lower_is_better)
           values ('مسابقه‌ی کراسفیت', 'crossfit', now() + interval '3 days', 2, array['RX', 'Scaled'], 'time', true) returning id)
insert into tests.ids select 'cf', id from e;
with e as (insert into public.events (title, kind, is_competition, starts_at, status)
           values ('فوتبال کنار استخر', 'social', false, now() + interval '2 days', 'draft') returning id)
insert into tests.ids select 'party', id from e;

-- signing up
select tests.act_as('ath1');
select tests.expect_error($$select public.register_event(tests.id('cf'))$$, 'pick_division');
select tests.expect_error($$select public.register_event(tests.id('cf'), 'Elite')$$, 'pick_division');
select tests.eq(public.register_event(tests.id('cf'), 'RX'), 'registered'::event_reg_status, 'ath1 in RX');
select tests.eq(public.register_event(tests.id('cf'), 'Scaled'), 'registered'::event_reg_status, 'changing division is not a second seat');
select tests.expect_error($$select public.register_event(tests.id('party'))$$, 'event_not_found');
select tests.eq((select count(*)::int from public.event_list(now()) where id = tests.id('party')), 0, 'drafts hidden from members');
select tests.act_as('ath2');
select public.register_event(tests.id('cf'), 'RX');
select tests.act_as('ath3');
select tests.expect_error($$select public.register_event(tests.id('cf'), 'RX')$$, 'event_full');
select tests.act_as('ath2');
select public.cancel_event_registration(tests.id('cf'));
select tests.act_as('ath3');
select tests.eq(public.register_event(tests.id('cf'), 'RX'), 'registered'::event_reg_status, 'a freed place can be taken');
select tests.expect_error($$insert into public.event_registrations (event_id, student_id) values (tests.id('cf'), tests.id('ath3'))$$, 'row-level security');
select tests.eq((select registered from public.event_list(now()) where id = tests.id('cf')), 2, 'count');

-- another gym cannot see or join it
select tests.act_as('outsider');
select tests.eq((select count(*)::int from public.events), 0, 'outsider sees no events');
select tests.expect_error($$select public.register_event(tests.id('cf'), 'RX')$$, 'event_not_found');
select tests.expect_error($$select * from public.event_leaderboard(tests.id('cf'))$$, 'event_not_found');

-- results and ranking: time, lower is better, per division
select tests.act_as('host');
insert into public.event_results (event_id, student_id, division, score) values
  (tests.id('cf'), tests.id('ath1'), 'Scaled', 610),
  (tests.id('cf'), tests.id('ath3'), 'RX', 540),
  (tests.id('cf'), tests.id('ath4'), 'RX', 498);
select tests.act_as('ath3');
select tests.eq((select place from public.event_leaderboard(tests.id('cf')) where student_id = tests.id('ath3')), 2, 'slower RX time is second');
select tests.eq((select place from public.event_leaderboard(tests.id('cf')) where student_id = tests.id('ath1')), 1, 'alone in Scaled is first');
select tests.eq((select is_me from public.event_leaderboard(tests.id('cf')) where student_id = tests.id('ath3')), true, 'is_me');
select tests.expect_error($$insert into public.event_results (event_id, student_id, score) values (tests.id('cf'), tests.id('ath3'), 1)$$, 'row-level security');
select tests.act_as('outsider');
select tests.eq((select count(*)::int from public.event_results), 0, 'results stay in the gym');

-- a started event takes no sign-ups or cancellations
select tests.act_as_owner();
update public.events set starts_at = now() - interval '1 hour' where id = tests.id('cf');
select tests.act_as('ath3');
select tests.expect_error($$select public.cancel_event_registration(tests.id('cf'))$$, 'event_started');
select tests.act_as('ath2');
select tests.expect_error($$select public.register_event(tests.id('cf'), 'RX')$$, 'registration_closed');
rollback;
