-- ============================================================
-- Real training programmes
--
-- Exercise selection, sets and rep ranges come from published
-- push/pull/legs and beginner full-body routines rather than invented
-- numbers, so the app demonstrates realistic prescriptions.
--
-- Sources consulted:
--   hevyapp.com/push-pull-legs-ultimate-guide
--   muscleandstrength.com/workouts/3-day-workout-routine-and-diet-for-beginners
--
-- Demo accounts, same teardown as 0004: deleting the auth users removes
-- everything below by cascade.
-- ============================================================

insert into public.exercises (name, muscle_group, level, duration_seconds, instructions, created_by) values
  ('نشر جانب دمبل',        'شانه', 'beginner',     29, 'آرنج کمی خم؛ تا ارتفاع شانه بالا ببر، بالاتر نه.',            '33333333-3333-3333-3333-333333333333'),
  ('پشت‌بازو سیم‌کش طناب', 'بازو', 'beginner',     28, 'آرنج کنار بدن قفل بماند؛ فقط ساعد حرکت کند.',                 '33333333-3333-3333-3333-333333333333'),
  ('زیربغل هالتر خم',      'پشت',  'intermediate', 46, 'کمر صاف و حدود ۴۵ درجه خم؛ میله را به ناف بکش.',              '33333333-3333-3333-3333-333333333333'),
  ('قایقی سیم‌کش',         'پشت',  'beginner',     39, 'سینه بالا، شانه‌ها عقب؛ از کمر تاب نده.',                      '33333333-3333-3333-3333-333333333333'),
  ('شراگ دمبل',            'پشت',  'beginner',     26, 'فقط شانه بالا برود؛ نچرخان.',                                  '33333333-3333-3333-3333-333333333333'),
  ('فیس پول',              'شانه', 'intermediate', 34, 'طناب را به سمت پیشانی بکش و آرنج را بالای مچ نگه دار.',        '33333333-3333-3333-3333-333333333333'),
  ('ددلیفت رومانیایی',     'پا',   'intermediate', 43, 'زانو کمی خم و ثابت؛ حرکت از لگن به عقب.',                      '33333333-3333-3333-3333-333333333333'),
  ('جلوپا دستگاه',         'پا',   'beginner',     30, 'در انتها مکث کوتاه؛ زانو را قفل نکن.',                         '33333333-3333-3333-3333-333333333333'),
  ('پشت‌پا نشسته',         'پا',   'beginner',     31, 'لگن ثابت روی صندلی؛ دامنه‌ی کامل.',                            '33333333-3333-3333-3333-333333333333'),
  ('ساق پا نشسته',         'پا',   'beginner',     24, 'در بالا یک ثانیه مکث کن.',                                     '33333333-3333-3333-3333-333333333333'),
  ('کرانچ سیم‌کش',         'شکم',  'intermediate', 33, 'از شکم جمع کن نه از لگن؛ نفس را بیرون بده.',                   '33333333-3333-3333-3333-333333333333'),
  ('سرشانه هالتر',         'شانه', 'intermediate', 37, 'هسته‌ی بدن سفت؛ کمر را قوس نده.',                              '33333333-3333-3333-3333-333333333333'),
  ('پلانک',                'شکم',  'beginner',     45, 'بدن یک خط صاف از سر تا پاشنه؛ لگن را بالا نبر.',               '33333333-3333-3333-3333-333333333333'),
  ('پرس بالا سینه دمبل',   'سینه', 'intermediate', 40, 'نیمکت روی ۳۰ درجه؛ دمبل‌ها را بالای سینه جمع کن.',            '33333333-3333-3333-3333-333333333333')
on conflict do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, phone,
  encrypted_password, email_confirmed_at, phone_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000', '77777777-7777-7777-7777-777777777777',
   'authenticated', 'authenticated', 'negar@fitclub.invalid', '+989121110007',
   crypt('demo1234', gen_salt('bf')), now(), now(), now() - interval '40 days', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"نگار صادقی"}'::jsonb, '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '88888888-8888-8888-8888-888888888888',
   'authenticated', 'authenticated', 'sina@fitclub.invalid', '+989121110008',
   crypt('demo1234', gen_salt('bf')), now(), now(), now() - interval '9 days', now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"سینا جعفری"}'::jsonb, '', '', '', '', '', '', '', '');

insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
select gen_random_uuid(), u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', u.email, now(), now()
from auth.users u
where u.id in ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888');

update public.profiles set
  username = 'negar', role = 'student', sex = 'female', birth_date = '1996-11-03',
  height_cm = 166, weight_kg = 68.2, goal = 'lose', activity_level = 3
where id = '77777777-7777-7777-7777-777777777777';

update public.profiles set
  username = 'sina', role = 'student', sex = 'male', birth_date = '2004-02-19',
  height_cm = 175, weight_kg = 62.5, goal = 'gain', activity_level = 2
where id = '88888888-8888-8888-8888-888888888888';

insert into public.memberships (id, student_id, plan_id, started_on, expires_on, sessions_total, sessions_used, status)
select 'aaaaaaaa-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777',
       id, current_date - 24, current_date + 6, 16, 13, 'active'
from public.plans where kind = 'pro';

insert into public.memberships (id, student_id, plan_id, started_on, expires_on, sessions_total, sessions_used, status)
select 'aaaaaaaa-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
       id, current_date - 8, current_date + 22, 12, 3, 'active'
from public.plans where kind = 'basic';

-- Amir moves onto a proper push day; the old programme is kept as history.
update public.programs set status = 'archived'
where id = '55555555-5555-5555-5555-555555555555';

insert into public.programs (id, student_id, coach_id, title, notes, status, published_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
   'روز پوش — سینه، سرشانه، پشت‌بازو',
   'دو حرکت اول سنگین با تکرار کم. وقتی در همه‌ی ست‌ها به سقف تکرار رسیدی، جلسه‌ی بعد وزنه را ۲.۵ کیلو ببر بالا.',
   'published', now() - interval '3 days'),
  ('bbbbbbbb-0000-0000-0000-000000000002',
   '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222',
   'روز پا و شکم',
   'بین ست‌های اسکوات ۲ دقیقه استراحت. اگر زانو درد گرفت همان جلسه بگو.',
   'published', now() - interval '2 days'),
  ('bbbbbbbb-0000-0000-0000-000000000003',
   '88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222',
   'تمام‌بدن مبتدی',
   'سه جلسه در هفته با یک روز فاصله. تمرکز روی فرم درست، نه وزنه‌ی سنگین.',
   'published', now() - interval '6 days');

insert into public.program_items (program_id, exercise_id, position, sets, reps, rest_seconds)
select v.prog::uuid, e.id, v.pos, v.sets, v.reps, v.rest
from (values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'پرس سینه هالتر',        1, 3, 8,  150),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'پرس بالا سینه دمبل',    2, 3, 10, 120),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'سرشانه دمبل',           3, 3, 11, 120),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'کراس اور سیم‌کش',       4, 3, 13, 90),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'نشر جانب دمبل',         5, 3, 14, 60),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'پشت‌بازو سیم‌کش طناب',  6, 3, 14, 60),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'اسکوات هالتر',          1, 3, 8,  180),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'ددلیفت رومانیایی',      2, 3, 11, 150),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'جلوپا دستگاه',          3, 3, 13, 90),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'پشت‌پا نشسته',          4, 3, 13, 90),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'ساق پا نشسته',          5, 3, 14, 60),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'کرانچ سیم‌کش',          6, 3, 17, 60),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'اسکوات هالتر',          1, 3, 10, 120),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'پرس سینه هالتر',        2, 3, 10, 120),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'زیربغل هالتر خم',       3, 3, 10, 120),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'سرشانه هالتر',          4, 2, 12, 90),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'زیربغل سیم‌کش',         5, 2, 12, 90),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'پلانک',                 6, 3, 1,  60)
) as v(prog, nm, pos, sets, reps, rest)
join public.exercises e on e.name = v.nm;

-- last session's weights, so the progress delta has something to compare
insert into public.workout_logs (program_item_id, student_id, performed_on, weight_kg, completed)
select pi.id, p.student_id, current_date - 3,
       case pi.position when 1 then 62.5 when 2 then 22 when 3 then 16
                        when 4 then 20 when 5 then 8 else 25 end, true
from public.program_items pi join public.programs p on p.id = pi.program_id
where p.id = 'bbbbbbbb-0000-0000-0000-000000000001';

insert into public.workout_logs (program_item_id, student_id, performed_on, weight_kg, completed)
select pi.id, p.student_id, current_date - 2,
       case pi.position when 1 then 45 when 2 then 35 when 3 then 30
                        when 4 then 25 when 5 then 40 else 15 end, true
from public.program_items pi join public.programs p on p.id = pi.program_id
where p.id = 'bbbbbbbb-0000-0000-0000-000000000002';

insert into public.workout_logs (program_item_id, student_id, performed_on, weight_kg, completed)
select pi.id, p.student_id, current_date - 4,
       case pi.position when 1 then 30 when 2 then 30 when 3 then 25
                        when 4 then 17.5 when 5 then 30 else null end, true
from public.program_items pi join public.programs p on p.id = pi.program_id
where p.id = 'bbbbbbbb-0000-0000-0000-000000000003';

insert into public.diet_plans (id, student_id, coach_id, target_kcal, protein_g, carb_g, fat_g, ai_generated, status) values
  ('cccccccc-0000-0000-0000-000000000001', '77777777-7777-7777-7777-777777777777',
   '22222222-2222-2222-2222-222222222222', 1690, 164, 137, 47, true, 'published'),
  ('cccccccc-0000-0000-0000-000000000002', '88888888-8888-8888-8888-888888888888',
   '22222222-2222-2222-2222-222222222222', 2570, 125, 356, 71, true, 'published');

insert into public.diet_meals (diet_plan_id, position, name, time_of_day, items, kcal) values
  ('cccccccc-0000-0000-0000-000000000001', 1, 'صبحانه',    '07:00', 'املت ۳ سفیده و یک زرده، یک کف دست نان جو، خیار و گوجه', 320),
  ('cccccccc-0000-0000-0000-000000000001', 2, 'میان‌وعده', '10:30', 'ماست یونانی کم‌چرب با یک قاشق دانه چیا',                 180),
  ('cccccccc-0000-0000-0000-000000000001', 3, 'ناهار',     '13:00', '۱۵۰ گرم مرغ گریل، سالاد بزرگ با لیمو، نصف پیمانه کینوا', 520),
  ('cccccccc-0000-0000-0000-000000000001', 4, 'قبل تمرین', '17:30', 'یک سیب و ۱۰ عدد بادام',                                  170),
  ('cccccccc-0000-0000-0000-000000000001', 5, 'شام',       '20:30', '۱۲۰ گرم ماهی سفید بخارپز با سبزیجات',                    380),
  ('cccccccc-0000-0000-0000-000000000002', 1, 'صبحانه',    '07:30', '۳ تخم‌مرغ، ۲ کف دست نان بربری، عسل و کره بادام‌زمینی',   720),
  ('cccccccc-0000-0000-0000-000000000002', 2, 'میان‌وعده', '10:30', 'شیر موز با یک اسکوپ پروتئین',                            430),
  ('cccccccc-0000-0000-0000-000000000002', 3, 'ناهار',     '13:30', 'چلو مرغ خانگی با ماست و سالاد',                          780),
  ('cccccccc-0000-0000-0000-000000000002', 4, 'قبل تمرین', '17:00', '۲ عدد خرما و یک لیوان شیر',                              240),
  ('cccccccc-0000-0000-0000-000000000002', 5, 'شام',       '21:00', 'ساندویچ تن ماهی با نان سبوس‌دار و سبزیجات',              400);

insert into public.cards (student_id, uid, label) values
  ('77777777-7777-7777-7777-777777777777', '04C9F2A710', 'کارت ۰۳۱۹'),
  ('88888888-8888-8888-8888-888888888888', '04E1B83C55', 'کارت ۰۵۵۱');

insert into public.checkins (student_id, membership_id, card_id, kind, at, deducted)
select c.student_id, m.id, c.id, v.kind::checkin_kind,
       ((current_date - v.days_ago) + v.clock) at time zone 'Asia/Tehran', v.ded
from public.cards c
join public.memberships m on m.student_id = c.student_id and m.status = 'active',
(values
  ('in', 2, time '17:40', true), ('out', 2, time '19:20', false),
  ('in', 4, time '17:35', true), ('out', 4, time '19:10', false),
  ('in', 6, time '18:05', true)
) as v(kind, days_ago, clock, ded)
where c.uid in ('04C9F2A710', '04E1B83C55');

insert into public.requests (student_id, coach_id, kind, status, message) values
  ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222',
   'workout', 'pending', 'برنامه‌ی الان برام سبکه، میشه سنگین‌ترش کنید؟'),
  ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222',
   'diet', 'scheduled', 'برای هفته‌ی بعد وقت بازبینی رژیم می‌خوام.');
