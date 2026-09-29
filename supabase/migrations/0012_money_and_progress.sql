-- ============================================================
-- Fit Club — what a member actually paid, and how their body changed
--
-- Two gaps that cost the gym real money.
--
-- MONEY. `memberships` recorded which plan somebody is on but never
-- what they handed over. The admin overview had to sum the list price
-- of every active plan and label the result "not a revenue forecast",
-- because it genuinely was not one: a discount left no trace, an
-- instalment left no trace, and nobody could answer "who still owes
-- us?" without the notebook on the desk.
--
-- PROGRESS. `profiles.weight_kg` was a single number overwritten in
-- place, so the app knew today's weight and had no idea it used to be
-- anything else. Members leave when they cannot see that they are
-- getting anywhere.
-- ============================================================

-- ============================================================
-- 1. Body measurements over time
-- ============================================================

-- Where a reading came from. It is the same history whether the member
-- stepped on their own scale or the gym ran a body composition test, so
-- both live in one table and the chart draws one continuous line — but
-- a bathroom scale and an InBody are not equally trustworthy, and a
-- member must not be able to publish a reading as the gym's instrument.
create type metric_source as enum ('self', 'analyzer', 'coach');

comment on type metric_source is
  'self = the member''s own scale; analyzer = the gym''s body composition machine; coach = tape measure at the desk.';

create table public.body_metrics (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  measured_on   date not null default (now() at time zone 'Asia/Tehran')::date,
  source        metric_source not null default 'self',
  recorded_by   uuid references public.profiles (id) on delete set null,

  -- The one figure every source provides.
  weight_kg     numeric(5,1),

  -- What a body composition analyser adds. All nullable: a scale in a
  -- bathroom reports the first field and none of these.
  body_fat_pct     numeric(4,1),
  muscle_mass_kg   numeric(5,1),
  body_water_pct   numeric(4,1),
  bone_mass_kg     numeric(4,1),
  visceral_fat     smallint,
  metabolic_age    smallint,
  bmr_kcal         integer,

  -- Tape measurements. These move when the scale does not — the reason
  -- to keep taking them at all.
  neck_cm       numeric(4,1),
  chest_cm      numeric(4,1),
  waist_cm      numeric(4,1),
  hip_cm        numeric(4,1),
  arm_cm        numeric(4,1),
  thigh_cm      numeric(4,1),

  note          text,
  created_at    timestamptz not null default now(),

  -- Ranges wide enough for any real person and narrow enough to catch a
  -- slipped decimal point, because one 840 kg reading flattens the whole
  -- chart and the member concludes the app is broken.
  constraint weight_sane     check (weight_kg      is null or weight_kg      between 20  and 400),
  constraint fat_sane        check (body_fat_pct   is null or body_fat_pct   between 1   and 70),
  constraint muscle_sane     check (muscle_mass_kg is null or muscle_mass_kg between 10  and 150),
  constraint water_sane      check (body_water_pct is null or body_water_pct between 20  and 80),
  constraint bone_sane       check (bone_mass_kg   is null or bone_mass_kg   between 1   and 10),
  constraint visceral_sane   check (visceral_fat   is null or visceral_fat   between 1   and 60),
  constraint metabolic_sane  check (metabolic_age  is null or metabolic_age  between 10  and 99),
  constraint bmr_sane        check (bmr_kcal       is null or bmr_kcal       between 600 and 4000),
  constraint girth_sane      check (
    (neck_cm  is null or neck_cm  between 20 and 80)  and
    (chest_cm is null or chest_cm between 50 and 200) and
    (waist_cm is null or waist_cm between 40 and 200) and
    (hip_cm   is null or hip_cm   between 50 and 200) and
    (arm_cm   is null or arm_cm   between 15 and 80)  and
    (thigh_cm is null or thigh_cm between 25 and 120)
  ),

  -- An empty row is not a measurement.
  constraint something_measured check (
    coalesce(weight_kg, body_fat_pct, muscle_mass_kg, body_water_pct,
             bone_mass_kg, visceral_fat, metabolic_age, bmr_kcal,
             neck_cm, chest_cm, waist_cm, hip_cm, arm_cm, thigh_cm) is not null
  ),

  -- Weighing yourself twice in one morning corrects the morning's
  -- figure rather than putting two dots on the chart. A self weigh-in
  -- and an analyser test on the same day are different readings and
  -- both survive.
  constraint one_reading_per_source_per_day unique (student_id, measured_on, source)
);

create index on public.body_metrics (student_id, measured_on desc);

comment on table public.body_metrics is
  'Weight and body composition over time. One row per member per day per source.';

-- ------------------------------------------------------------
-- Keep profiles.weight_kg pointing at the newest reading
-- ------------------------------------------------------------
-- The calorie target in lib/nutrition.ts reads profiles.weight_kg, so a
-- member who logs 4 kg lost and keeps being fed the old target has been
-- given a worse answer by the app than by their own scale. Only the
-- latest measurement wins, so back-filling an old reading cannot
-- rewrite today's.
--
-- Not SECURITY DEFINER on purpose: it runs as the caller, whose own
-- profile policy already permits this, and a definer here would be a
-- way to write any profile row.
create or replace function public.sync_profile_weight()
returns trigger
language plpgsql set search_path = public as $$
begin
  if new.weight_kg is null then
    return new;
  end if;

  if exists (
    select 1 from public.body_metrics m
     where m.student_id = new.student_id
       and m.weight_kg is not null
       and (m.measured_on > new.measured_on
            or (m.measured_on = new.measured_on and m.created_at > new.created_at))
  ) then
    return new;
  end if;

  update public.profiles
     set weight_kg = new.weight_kg
   where id = new.student_id;

  return new;
end;
$$;

create trigger body_metrics_sync_weight
  after insert or update on public.body_metrics
  for each row execute function public.sync_profile_weight();

-- ============================================================
-- 2. Money
-- ============================================================

create type payment_method as enum ('cash', 'card', 'transfer', 'other');

comment on type payment_method is
  'cash = نقدی, card = کارتخوان, transfer = کارت‌به‌کارت یا واریز, other = هر چیز دیگر.';

-- What was agreed for this subscription, after any haggling. Snapshot
-- at the point of sale for the same reason sessions_total already is:
-- the list price changes, and a member who was quoted 4,200,000 is owed
-- that number for ever.
alter table public.memberships
  add column if not exists price_toman bigint;

update public.memberships m
   set price_toman = p.price_toman
  from public.plans p
 where p.id = m.plan_id
   and m.price_toman is null;

comment on column public.memberships.price_toman is
  'Agreed price at the point of sale, discount included. Payments are recorded separately.';

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  -- Nullable: the desk also sells a locker, a shaker or a single
  -- session, and refusing to record that money because it is not
  -- attached to a subscription is how a cash drawer stops balancing.
  membership_id uuid references public.memberships (id) on delete set null,
  amount_toman  bigint not null,
  method        payment_method not null default 'cash',
  paid_at       timestamptz not null default now(),
  recorded_by   uuid references public.profiles (id) on delete set null,
  note          text,
  created_at    timestamptz not null default now(),

  -- Signed: a refund is a negative payment, so the end-of-day total is
  -- a plain sum and cannot disagree with the drawer. Zero is a typo.
  constraint amount_not_zero check (amount_toman <> 0)
);

create index on public.payments (student_id, paid_at desc);
create index on public.payments (membership_id);
create index on public.payments (paid_at desc);

comment on table public.payments is
  'Money actually received, in instalments if need be. A negative amount is a refund.';

-- What each subscription is still owed, without every screen
-- re-deriving the same join and getting it subtly different.
-- security_invoker so the view obeys the caller's row level security
-- rather than the owner's — otherwise it would hand any signed-in
-- member the whole gym's ledger.
create or replace view public.membership_ledger
with (security_invoker = true) as
select
  m.id            as membership_id,
  m.student_id,
  m.status,
  m.started_on,
  m.expires_on,
  coalesce(m.price_toman, 0)                       as price_toman,
  coalesce(sum(pay.amount_toman), 0)::bigint       as paid_toman,
  (coalesce(m.price_toman, 0)
     - coalesce(sum(pay.amount_toman), 0))::bigint as balance_toman
from public.memberships m
left join public.payments pay on pay.membership_id = m.id
group by m.id;

comment on view public.membership_ledger is
  'Agreed price against money received. A positive balance is what the member still owes.';

-- ============================================================
-- 3. Row level security
-- ============================================================

alter table public.body_metrics enable row level security;
alter table public.payments     enable row level security;

-- A member sees their own history and may log their own weight — but
-- only ever as their own scale. Presenting a typed-in number as the
-- gym's analyser output would make the one trustworthy reading in the
-- table untrustworthy, so the source is pinned in the policy where the
-- client cannot reach it.
create policy body_metrics_read on public.body_metrics for select
  using (student_id = auth.uid() or public.fc_is_staff());

create policy body_metrics_self_write on public.body_metrics for insert
  with check (student_id = auth.uid() and source = 'self');

create policy body_metrics_self_update on public.body_metrics for update
  using (student_id = auth.uid() and source = 'self')
  with check (student_id = auth.uid() and source = 'self');

create policy body_metrics_self_delete on public.body_metrics for delete
  using (student_id = auth.uid() and source = 'self');

create policy body_metrics_staff on public.body_metrics for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

-- Money is read by the member it belongs to and written only by staff.
-- Nobody records their own payment.
create policy payments_read on public.payments for select
  using (student_id = auth.uid() or public.fc_is_staff());

create policy payments_staff on public.payments for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

revoke all on public.body_metrics from anon;
revoke all on public.payments     from anon;
revoke all on public.membership_ledger from anon;
grant select, insert, update, delete on public.body_metrics to authenticated;
grant select, insert, update, delete on public.payments     to authenticated;
grant select on public.membership_ledger to authenticated;

-- The renewal list asks "who runs out in the next seven days" on every
-- staff page load; without this it is a sequential scan of the roster.
create index if not exists memberships_expiry on public.memberships (status, expires_on);
