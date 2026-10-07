-- One app, many gyms: nothing crosses from one gym to another.
begin;

select tests.make_user('root', 'admin');
update public.profiles set gym_id = null where id = tests.id('root');
insert into public.platform_admins (user_id) values (tests.id('root'));

select tests.make_user('adminA', 'admin');
select tests.make_user('memA');
insert into tests.ids select 'memA_m', tests.give_membership('memA');

-- the platform creates a CrossFit box; it starts from the first gym's template
select tests.act_as('root');
insert into tests.ids select 'box', public.platform_create_gym('باکس', 'box', 'crossfit');
select tests.act_as_owner();
select tests.eq((select classes_enabled from public.gyms where slug = 'box'), true, 'a CrossFit box gets classes by default');
select tests.eq((select count(*) > 0 from public.plans where gym_id = tests.gym('box')), true, 'template plans copied');
select tests.eq((select value #>> '{}' from public.settings where gym_id = tests.gym('box') and key = 'gym_name'), 'باکس', 'gym name setting set');

-- the platform creates the box's admin; that admin creates the box's people
select tests.act_as('root');
insert into tests.ids select 'adminB', public.admin_create_user('box_admin', 'longpassword', 'مدیر باکس', 'admin', tests.gym('box'));
select tests.expect_error($$select public.admin_create_user('nogym', 'longpassword', 'x', 'admin', null)$$, 'gym_required');
select tests.act_as('adminB');
insert into tests.ids select 'memB', public.admin_create_user('box_member', 'longpassword', 'عضو باکس', 'student', null);
select tests.expect_error($$select public.admin_create_user('sneaky', 'longpassword', 'x', 'student', tests.gym('fitclub'))$$, 'only an admin');
select tests.act_as_owner();
select tests.eq((select gym_id from public.profiles where id = tests.id('memB')), tests.gym('box'), 'new member lands in the creator''s gym');
insert into tests.ids select 'memB_m', tests.give_membership('memB');

-- ---- staff of one gym see nothing of the other ----
select tests.act_as('adminB');
select tests.eq((select count(*)::int from public.profiles where id = tests.id('memA')), 0, 'box admin cannot see a Fit Club member');
select tests.eq((select count(*)::int from public.memberships where student_id = tests.id('memA')), 0, 'nor their subscription');
select tests.expect_error($$insert into public.payments (student_id, amount_toman) values (tests.id('memA'), 1000)$$, 'row-level security');
select tests.expect_error($$select public.admin_set_password(tests.id('memA'), 'anotherpass')$$, 'only an admin');
select tests.expect_error($$select public.freeze_membership(tests.id('memA_m'), null)$$, 'staff_only');
update public.settings set value = 'false'::jsonb where key = 'checkin_module_enabled';
select tests.expect_error($$select * from public.platform_gyms()$$, 'platform_only');
select tests.expect_error($$update public.gyms set kind = 'bodybuilding' where slug = 'box'$$, 'permission denied');
select tests.act_as_owner();
select tests.eq((select value from public.settings where key = 'checkin_module_enabled' and gym_id = tests.gym('fitclub')), 'true'::jsonb, 'another gym''s settings untouched');
select tests.eq((select value from public.settings where key = 'checkin_module_enabled' and gym_id = tests.gym('box')), 'false'::jsonb, 'own settings changed');

-- ---- members only see their own gym ----
with s as (insert into public.class_sessions (gym_id, title, starts_at, capacity) values (tests.gym(), 'Fit Club class', now() + interval '1 day', 5) returning id)
insert into tests.ids select 'clsA', id from s;
with s as (insert into public.class_sessions (gym_id, title, starts_at, capacity) values (tests.gym('box'), 'WOD', now() + interval '1 day', 5) returning id)
insert into tests.ids select 'clsB', id from s;
select tests.act_as('memB');
select tests.eq((select string_agg(title, ',') from public.class_schedule(now(), now() + interval '7 days')), 'WOD', 'timetable is the box''s only');
select tests.expect_error($$select public.book_class(tests.id('clsA'))$$, 'class_not_found');
select tests.eq(public.book_class(tests.id('clsB')), 'booked'::booking_status, 'books in own gym');
select tests.eq((select count(*)::int from public.coach_directory where id = tests.id('adminA')), 0, 'other gym''s staff are not listed');
select tests.eq((select count(*)::int from public.exercises where gym_id = tests.gym('fitclub')), 0, 'other gym''s library hidden');

-- ---- nobody promotes themselves or changes gym ----
select tests.act_as('memA');
update public.profiles set full_name = 'نام تازه' where id = tests.id('memA');
select tests.expect_error($$update public.profiles set role = 'admin' where id = tests.id('memA')$$, 'not_allowed');
select tests.expect_error($$update public.profiles set gym_id = tests.gym('box') where id = tests.id('memA')$$, 'gym_is_fixed');
select tests.act_as('adminA');
update public.profiles set role = 'coach' where id = tests.id('memA');
select tests.expect_error($$update public.profiles set role = 'student' where id = tests.id('adminA')$$, 'not_allowed');
select tests.act_as_owner();
select tests.eq((select full_name from public.profiles where id = tests.id('memA')), 'نام تازه', 'own name still editable');
select tests.eq((select role from public.profiles where id = tests.id('memA')), 'coach'::user_role, 'admin changes others'' roles');

-- ---- the platform sees every gym ----
select tests.act_as('root');
select tests.eq((select count(*)::int from public.platform_gyms()), 2, 'two gyms listed');
select public.platform_update_gym(tests.gym('box'), 'باکس تهران', 'crossfit', true, false, true);
select tests.act_as_owner();
select tests.eq((select events_enabled from public.gyms where slug = 'box'), false, 'feature switched off');
select tests.eq((select value #>> '{}' from public.settings where gym_id = tests.gym('box') and key = 'gym_name'), 'باکس تهران', 'rename follows to settings');

rollback;
