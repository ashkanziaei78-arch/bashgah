-- ============================================================
-- Fit Club — demo data
--
-- Everything hangs off three fixed user ids, so one statement clears it:
--   delete from auth.users where id in (
--     '11111111-1111-1111-1111-111111111111',
--     '22222222-2222-2222-2222-222222222222',
--     '33333333-3333-3333-3333-333333333333');
-- The cascade takes the profiles, membership, programme and check-ins
-- with it. The exercise library is kept deliberately — it is real
-- reference content, not demo filler.
-- ============================================================

insert into auth.users (
  instance_id, id, aud, role, email, phone,
  encrypted_password, email_confirmed_at, phone_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  -- GoTrue reads these into Go strings, which cannot hold NULL. Users
  -- created through the API get ''; hand-inserted ones do not, and every
  -- sign-in then fails with "Database error querying schema".
  confirmation_token, recovery_token, email_change,
  email_change_token_new, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'amir@demo.fitclub', '+989121110001',
   crypt('demo1234', gen_salt('bf')), now(), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"امیر محمدی"}'::jsonb,
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'ali@demo.fitclub', '+989121110002',
   crypt('demo1234', gen_salt('bf')), now(), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"علی رضایی"}'::jsonb,
   '', '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'admin@demo.fitclub', '+989121110003',
   crypt('demo1234', gen_salt('bf')), now(), now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"مدیر باشگاه"}'::jsonb,
   '', '', '', '', '', '', '', '');

-- signInWithPassword resolves through identities, not just users
insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"amir@demo.fitclub","email_verified":true}'::jsonb,
   'email', 'amir@demo.fitclub', now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"ali@demo.fitclub","email_verified":true}'::jsonb,
   'email', 'ali@demo.fitclub', now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"admin@demo.fitclub","email_verified":true}'::jsonb,
   'email', 'admin@demo.fitclub', now(), now());

-- the signup trigger created the profiles; fill in roles and body stats
update public.profiles set
  role = 'student', sex = 'male', birth_date = '1999-04-12',
  height_cm = 179, weight_kg = 78.4, goal = 'gain', activity_level = 3
where id = '11111111-1111-1111-1111-111111111111';

update public.profiles set role = 'coach'
where id = '22222222-2222-2222-2222-222222222222';

update public.profiles set role = 'admin'
where id = '33333333-3333-3333-3333-333333333333';

-- exercise library
insert into public.exercises (name, muscle_group, level, duration_seconds, instructions, created_by) values
  ('پرس سینه هالتر',        'سینه', 'beginner',     42, 'کتف‌ها را جمع نگه دار، هالتر را تا روی خط سینه پایین بیاور.', '33333333-3333-3333-3333-333333333333'),
  ('قفسه سینه دمبل',        'سینه', 'intermediate', 38, 'آرنج کمی خم بماند؛ حرکت از مفصل شانه باشد نه آرنج.',          '33333333-3333-3333-3333-333333333333'),
  ('پرس بالا سینه دستگاه',  'سینه', 'beginner',     44, 'پشت را کامل به تکیه‌گاه بچسبان.',                              '33333333-3333-3333-3333-333333333333'),
  ('کراس اور سیم‌کش',       'سینه', 'intermediate', 47, 'در انتهای حرکت یک مکث کوتاه بگذار و عضله را منقبض کن.',        '33333333-3333-3333-3333-333333333333'),
  ('جلوبازو هالتر',         'بازو', 'beginner',     33, 'آرنج کنار بدن ثابت بماند؛ از کمر تاب نده.',                    '33333333-3333-3333-3333-333333333333'),
  ('جلوبازو چکشی دمبل',     'بازو', 'beginner',     31, 'کف دست‌ها رو به هم؛ مچ را نچرخان.',                            '33333333-3333-3333-3333-333333333333'),
  ('اسکوات هالتر',          'پا',   'advanced',     65, 'زانو هم‌راستای پنجه؛ تا موازی ران پایین برو.',                 '33333333-3333-3333-3333-333333333333'),
  ('ددلیفت',                'پشت',  'advanced',     51, 'کمر صاف، میله نزدیک ساق. حرکت از لگن شروع شود.',               '33333333-3333-3333-3333-333333333333'),
  ('زیربغل سیم‌کش',         'پشت',  'intermediate', 40, 'سینه را بالا نگه دار و آرنج را به پهلو بکش.',                  '33333333-3333-3333-3333-333333333333'),
  ('سرشانه دمبل',           'شانه', 'intermediate', 36, 'کمر را قوس نده؛ هسته‌ی بدن سفت بماند.',                        '33333333-3333-3333-3333-333333333333');

-- active membership: pro plan, 7 of 16 used, 12 days left
insert into public.memberships (id, student_id, plan_id, started_on, expires_on, sessions_total, sessions_used, status)
select '44444444-4444-4444-4444-444444444444',
       '11111111-1111-1111-1111-111111111111',
       id, current_date - 18, current_date + 12, 16, 7, 'active'
from public.plans where kind = 'pro';

-- a published workout programme
insert into public.programs (id, student_id, coach_id, title, notes, status, published_at)
values ('55555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'سینه و جلوبازو', 'بین ست‌ها ۹۰ ثانیه استراحت. هفته‌ی بعد وزنه را ۲.۵ کیلو بالا ببر.',
        'published', now() - interval '2 days');

insert into public.program_items (program_id, exercise_id, position, sets, reps, rest_seconds)
select '55555555-5555-5555-5555-555555555555', e.id, v.pos, v.sets, v.reps, 90
from (values
  ('پرس سینه هالتر', 1, 4, 10),
  ('قفسه سینه دمبل', 2, 3, 12),
  ('پرس بالا سینه دستگاه', 3, 3, 12),
  ('کراس اور سیم‌کش', 4, 3, 15),
  ('جلوبازو هالتر', 5, 3, 12),
  ('جلوبازو چکشی دمبل', 6, 3, 14)
) as v(nm, pos, sets, reps)
join public.exercises e on e.name = v.nm;

-- last session's weights, so "previous" has something to show
insert into public.workout_logs (program_item_id, student_id, performed_on, weight_kg, completed)
select pi.id, '11111111-1111-1111-1111-111111111111', current_date - 2,
       case pi.position
         when 1 then 57.5 when 2 then 14 when 3 then 45
         when 4 then 17.5 when 5 then 22.5 else 12 end,
       true
from public.program_items pi
where pi.program_id = '55555555-5555-5555-5555-555555555555';

-- nutrition, macros from the Mifflin-St Jeor calculator in lib/nutrition.ts
insert into public.diet_plans (id, student_id, coach_id, target_kcal, protein_g, carb_g, fat_g, ai_generated, status)
values ('66666666-6666-6666-6666-666666666666',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        2480, 157, 322, 69, true, 'published');

insert into public.diet_meals (diet_plan_id, position, name, time_of_day, items, kcal) values
  ('66666666-6666-6666-6666-666666666666', 1, 'صبحانه',    '07:30', '۴ عدد تخم‌مرغ آب‌پز، ۲ کف دست نان سنگک، ۳۰ گرم پنیر، یک لیوان شیر کم‌چرب', 580),
  ('66666666-6666-6666-6666-666666666666', 2, 'میان‌وعده', '10:30', '۳۰ گرم بادام خام، یک عدد موز', 320),
  ('66666666-6666-6666-6666-666666666666', 3, 'ناهار',     '13:30', '۱۸۰ گرم سینه مرغ گریل، یک پیمانه برنج قهوه‌ای، سالاد فصل با روغن زیتون', 710),
  ('66666666-6666-6666-6666-666666666666', 4, 'قبل تمرین', '17:00', 'یک اسکوپ پروتئین وی با آب، یک عدد خرما', 210),
  ('66666666-6666-6666-6666-666666666666', 5, 'شام',       '21:00', '۱۵۰ گرم ماهی قزل‌آلا، سیب‌زمینی تنوری، سبزیجات بخارپز', 660);

-- NFC card and a few taps, at plausible evening training hours in Tehran
insert into public.cards (student_id, uid, label)
values ('11111111-1111-1111-1111-111111111111', '04A2B7C1D3', 'کارت ۰۴۲۷');

insert into public.checkins (student_id, membership_id, card_id, kind, at, deducted)
select '11111111-1111-1111-1111-111111111111',
       '44444444-4444-4444-4444-444444444444',
       c.id, v.kind::checkin_kind,
       ((current_date - v.days_ago) + v.clock) at time zone 'Asia/Tehran',
       v.ded
from public.cards c,
(values
  ('in',  2, time '18:12', true),
  ('out', 2, time '20:05', false),
  ('in',  5, time '18:12', true),
  ('out', 5, time '20:05', false),
  ('in',  7, time '18:12', true)
) as v(kind, days_ago, clock, ded)
where c.uid = '04A2B7C1D3';

-- one request waiting in the coach's queue
insert into public.requests (student_id, coach_id, kind, status, message)
values ('11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'diet', 'pending', 'می‌خوام برنامه غذایی‌م برای حجم بازبینی بشه.');
