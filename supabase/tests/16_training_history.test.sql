begin;
select tests.make_user('pt', 'coach');
select tests.make_user('lia');
select tests.make_user('sam');

insert into public.exercises (name, muscle_group) values ('Squat', 'پا');
with p as (insert into public.programs (student_id, coach_id, title, status) values
  (tests.id('lia'), tests.id('pt'), 'old', 'archived'),
  (tests.id('lia'), tests.id('pt'), 'now', 'published'),
  (tests.id('lia'), tests.id('pt'), 'next', 'draft') returning id, title)
insert into tests.ids select 'prog_' || title, id from p;
insert into public.program_items (program_id, exercise_id, position)
select id, (select id from public.exercises where name = 'Squat'), 1 from tests.ids where name like 'prog_%';

select tests.act_as('lia');
select tests.eq((select string_agg(title, ',' order by title) from public.programs), 'now,old', 'own published and archived, not draft');
select tests.eq((select count(*)::int from public.program_items), 2, 'items of both');
select tests.act_as('sam');
select tests.eq((select count(*)::int from public.programs), 0, 'nobody else''s history');
select tests.eq((select count(*)::int from public.program_items), 0, 'nobody else''s items');
rollback;
