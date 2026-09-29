-- ============================================================
-- Fit Club — a demo member with something in every tab, and a
-- different photograph on every card
--
-- Two unrelated problems, one migration, because both are content
-- rather than schema.
--
-- 1. The `test` account could be signed into but every screen it
--    reached was an empty state: no programme, no diet, so no session
--    ring, no macro tiles, nothing to look at. Anyone opening the app
--    to judge it saw placeholder text.
--
-- 2. Every programme shared one cover photograph and every diet plan
--    shared another, which reads as a template rather than a gym.
--
-- Guarded throughout: on a fresh database the demo profiles do not
-- exist yet (they are minted at the desk through admin_create_user),
-- and this must no-op rather than fail the migration run. It is also
-- written to be safe to run twice.
--
-- No passwords here. Credentials belong nowhere near a file that is
-- committed to a public repository.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Photography, one per card
-- ------------------------------------------------------------
-- Hotlinked from Unsplash under its licence until the gym shoots its
-- own; `publicUrl()` passes an absolute URL straight through, so
-- swapping in a bucket path later is an UPDATE, not a migration.

update public.programs set cover_path = case title
    when 'سینه و جلوبازو'
      then 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1600&q=78'
    when 'روز پا و شکم'
      then 'https://images.unsplash.com/photo-1554284126-aa88f22d8b74?auto=format&fit=crop&w=1600&q=78'
    when 'تمام‌بدن مبتدی'
      then 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=1600&q=78'
    when 'روز پوش — سینه، سرشانه، پشت‌بازو'
      then 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1600&q=78'
    else cover_path
  end
where title in (
  'سینه و جلوبازو',
  'روز پا و شکم',
  'تمام‌بدن مبتدی',
  'روز پوش — سینه، سرشانه، پشت‌بازو'
);

-- Diets have no title to switch on, so they are numbered by age and
-- dealt a photo each.
with ordered as (
  select id, row_number() over (order by created_at) - 1 as n
    from public.diet_plans
   where status = 'published'
),
art as (
  select * from (values
    (0, 'https://images.unsplash.com/photo-1543352632-5a4b24e4d2a6?auto=format&fit=crop&w=1400&q=78'),
    (1, 'https://images.unsplash.com/photo-1569420077790-afb136b3bb8c?auto=format&fit=crop&w=1400&q=78'),
    (2, 'https://images.unsplash.com/photo-1543352632-fea6d4f83e78?auto=format&fit=crop&w=1400&q=78'),
    (3, 'https://images.unsplash.com/photo-1606858374191-c18040e98ad7?auto=format&fit=crop&w=1400&q=78')
  ) as t(n, url)
)
update public.diet_plans d
   set cover_path = art.url
  from ordered, art
 where d.id = ordered.id
   and art.n = ordered.n % 4;

-- ------------------------------------------------------------
-- 2. A programme and a diet for the demo member
-- ------------------------------------------------------------
do $$
declare
  v_student uuid;
  v_coach   uuid;
  v_program uuid;
  v_diet    uuid;
begin
  select id into v_student from public.profiles where username = 'test';
  select id into v_coach   from public.profiles where role = 'coach' order by created_at limit 1;

  -- Fresh database, or the demo accounts were never created: nothing
  -- to attach content to, and that is not an error.
  if v_student is null or v_coach is null then
    raise notice 'demo accounts absent — skipping demo content';
    return;
  end if;

  -- ---------- workout ----------
  if not exists (
    select 1 from public.programs
     where student_id = v_student and status = 'published'
  ) then
    insert into public.programs
      (student_id, coach_id, title, notes, cover_path, status, published_at)
    values (
      v_student, v_coach,
      'تمام‌بدن — چربی‌سوزی',
      'سه جلسه در هفته با یک روز فاصله. وزنه‌ها را طوری ببندید که دو تکرار آخر هر ست سخت باشد ولی فرم به هم نریزد. بین ست‌ها بنشینید و آب بخورید؛ استراحت‌ها را کوتاه‌تر از عدد نوشته‌شده نکنید.',
      'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=1600&q=78',
      'published', now()
    )
    returning id into v_program;

    insert into public.program_items
      (program_id, exercise_id, position, sets, reps, rest_seconds, note)
    select v_program, e.id, v.position, v.sets, v.reps, v.rest, v.note
      from (values
        ('اسکوات هالتر',          1, 4,  8, 120, 'گرم‌کردن با میله‌ی خالی، بعد دو ست سبک'),
        ('پرس سینه هالتر',        2, 4, 10,  90, null),
        ('زیربغل سیم‌کش',         3, 4, 12,  90, 'کتف را پایین نگه دارید، با بازو نکشید'),
        ('ددلیفت رومانیایی',      4, 3, 10, 100, 'زانو کمی خم، کمر صاف؛ کشش را در پشت ران حس کنید'),
        ('سرشانه دمبل',           5, 3, 12,  75, null),
        ('جلوبازو چکشی دمبل',     6, 3, 12,  60, null),
        ('پشت‌بازو سیم‌کش طناب',  7, 3, 15,  60, null),
        ('پلانک',                 8, 3,  1,  45, 'هر ست ۴۵ ثانیه نگه دارید')
      ) as v(name, position, sets, reps, rest, note)
      join public.exercises e on e.name = v.name;
  end if;

  -- ---------- diet ----------
  -- The calorie target is what lib/nutrition.ts computes for this
  -- member (181 cm, 84.2 kg, 30, active, cutting), so `ai_generated`
  -- is true and the app shows the calculated badge. Each meal's own
  -- figure comes from the estimator in lib/food-estimate.ts reading
  -- the very text written beside it — the five add up to 2414 against
  -- a 2408 target, which is the point of having the tool.
  if not exists (
    select 1 from public.diet_plans
     where student_id = v_student and status = 'published'
  ) then
    insert into public.diet_plans
      (student_id, coach_id, target_kcal, protein_g, carb_g, fat_g,
       ai_generated, cover_path, status)
    values (
      v_student, v_coach, 2408, 202, 249, 67, true,
      'https://images.unsplash.com/photo-1606858374191-c18040e98ad7?auto=format&fit=crop&w=1400&q=78',
      'published'
    )
    returning id into v_diet;

    insert into public.diet_meals
      (diet_plan_id, position, name, time_of_day, items, kcal)
    values
      (v_diet, 1, 'صبحانه', '07:30',
       '۳ عدد تخم مرغ آب پز، ۲ کف دست نان سنگک، ۳۰ گرم پنیر، یک لیوان چای', 512),
      (v_diet, 2, 'میان‌وعده', '10:30',
       'یک عدد سیب، ۲۵ گرم بادام و ۱۵۰ گرم ماست یونانی', 328),
      (v_diet, 3, 'ناهار', '13:30',
       '۲۰۰ گرم سینه مرغ، یک لیوان برنج پخته، سالاد شیرازی، یک قاشق روغن زیتون', 733),
      (v_diet, 4, 'قبل تمرین', '17:00',
       'یک عدد موز، ۲ عدد خرما و یک اسکوپ پودر پروتئین', 272),
      (v_diet, 5, 'شام', '21:00',
       '۱۵۰ گرم ماهی قزل آلا، ۲۰۰ گرم سیب زمینی آب پز، ۱۵۰ گرم کلم بروکلی، ۱۰۰ گرم ماست یونانی', 569);
  end if;
end $$;
