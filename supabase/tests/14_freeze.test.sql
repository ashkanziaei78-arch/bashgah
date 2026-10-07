-- Freezing a subscription and getting the days back on thaw.
begin;

select tests.make_user('desk', 'coach');
select tests.make_user('mia');
insert into tests.ids select 'mia_m', tests.give_membership('mia');
select tests.make_user('ned');
insert into tests.ids select 'ned_m', tests.give_membership('ned');

-- members cannot freeze themselves
select tests.act_as('mia');
select tests.expect_error($$select public.freeze_membership(tests.id('mia_m'), 'trip')$$, 'staff_only');
select tests.expect_error($$insert into public.membership_freezes (membership_id, student_id, started_on) values (tests.id('mia_m'), tests.id('mia'), current_date)$$, 'permission denied');

select tests.act_as('desk');
select public.freeze_membership(tests.id('mia_m'), 'سفر');
select tests.expect_error($$select public.freeze_membership(tests.id('mia_m'), null)$$, 'already_frozen');
select tests.act_as_owner();
select tests.eq((select status from public.memberships where id = tests.id('mia_m')), 'frozen'::member_status, 'frozen');

-- a frozen member cannot book a class
with s as (insert into public.class_sessions (title, starts_at, capacity) values ('HIIT', now() + interval '1 day', 5) returning id)
insert into tests.ids select 'cls', id from s;
select tests.act_as('mia');
select tests.expect_error($$select public.book_class(tests.id('cls'))$$, 'no_membership');
select tests.eq((select count(*)::int from public.membership_freezes), 1, 'member sees own freeze');

-- pretend the freeze began 10 days ago, then thaw: 10 days come back
select tests.act_as_owner();
update public.membership_freezes set started_on = public.fc_today() - 10 where membership_id = tests.id('mia_m');
create temp table before as select expires_on from public.memberships where id = tests.id('mia_m');
grant select on before to authenticated;
select tests.act_as('desk');
select tests.eq(public.thaw_membership(tests.id('mia_m')), (select expires_on + 10 from before), 'thaw adds the frozen days');
select tests.act_as_owner();
select tests.eq((select status from public.memberships where id = tests.id('mia_m')), 'active'::member_status, 'active again');
select tests.eq((select days_credited from public.membership_freezes where membership_id = tests.id('mia_m')), 10, 'credit recorded');
select tests.act_as('desk');
select tests.expect_error($$select public.thaw_membership(tests.id('mia_m'))$$, 'not_frozen');

-- the ceiling: 60 days in total per subscription
select public.freeze_membership(tests.id('mia_m'), null);
select tests.act_as_owner();
update public.membership_freezes set started_on = public.fc_today() - 80 where membership_id = tests.id('mia_m') and ended_on is null;
select tests.act_as('desk');
select public.thaw_membership(tests.id('mia_m'));
select tests.act_as_owner();
select tests.eq((select sum(days_credited)::int from public.membership_freezes where membership_id = tests.id('mia_m')), 60, 'never more than the ceiling');

-- an expired subscription cannot be frozen
update public.memberships set expires_on = current_date - 5 where id = tests.id('ned_m');
select tests.act_as('desk');
select tests.expect_error($$select public.freeze_membership(tests.id('ned_m'), null)$$, 'not_active');

-- legacy: frozen by the old switch, with no freeze record, just resumes
select tests.act_as_owner();
update public.memberships set expires_on = current_date + 20, status = 'frozen' where id = tests.id('ned_m');
select tests.act_as('desk');
select tests.eq(public.thaw_membership(tests.id('ned_m')), current_date + 20, 'legacy thaw keeps the date');
select tests.act_as_owner();
select tests.eq((select status from public.memberships where id = tests.id('ned_m')), 'active'::member_status, 'legacy resumed');

rollback;
