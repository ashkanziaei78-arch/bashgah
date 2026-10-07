# Fit Club

A gym management PWA for Fit Club, Tehran. Members get their training
programme, their diet, and their remaining sessions on their phone;
coaches write the programmes; the front desk runs the door.

Persian throughout, right-to-left, Jalali dates, Tehran timezone.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16, App Router, React 19 |
| Styling | Tailwind 4, tokens in `app/globals.css` |
| Backend | Supabase — Postgres, Auth, Storage |
| Install | PWA: manifest, service worker, generated icons |

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev
```

Then open http://localhost:3000.

`npm run verify` runs the gates together: contrast measurement, unit
tests, lint, and build. Run it before pushing.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run verify` | Contrast + unit tests + lint + build |
| `npm test` | Unit tests for the pure logic in `lib/` (`node --test`) |
| `npm run test:db` | Every migration plus the SQL tests, on a scratch Postgres |
| `npm run check:contrast` | Measures every token pair against WCAG 2.2 AA |
| `npm run icons` | Regenerates the PWA icon set from vector paths |
| `npm run photos` | Fills the image buckets from Pexels — see Photography |

## Sign-in

A **username and password**. Nothing else — no SMS provider, no phone
number, no email that has to receive anything.

Supabase Auth has no username grant, so each account maps to a
deterministic internal address: `ali` signs in as `ali@fitclub.invalid`.
`.invalid` is reserved by RFC 2606 and can never resolve, so nothing is
ever delivered there and it cannot collide with a real mailbox. The
client derives the address itself, which keeps sign-in to one request
and avoids a lookup endpoint that would let a stranger test whether a
username exists.

Wrong username and wrong password give the same message, for the same
reason.

## Accounts

The front desk creates member accounts; there is no public sign-up. An
admin makes them at **admin → اعضا → ساخت حساب تازه**, which suggests a
password built from an alphabet with no O/0 or l/1 in it, because
somebody has to read it aloud at a counter. The password is shown once
and then only ever stored hashed.

That runs through `admin_create_user()`, a definer function that
re-checks the caller is an admin inside the database. The alternative
was `SUPABASE_SERVICE_ROLE_KEY` — a key that bypasses row level security
entirely — sitting in the web server's environment so reception could
add a member. This needs no new secret.

A member who forgets their password asks reception to reset it.

`/dev-login` offers one-tap sign-in to the seeded accounts. It returns
404 when `NODE_ENV` is production, and needs `NEXT_PUBLIC_DEV_PASSWORD`
in `.env.local` — the password used to be a literal in that file, which
put a working admin login for the live project in a public repository.

## Database

Migrations live in `supabase/migrations`, applied in order.

| Migration | What it adds |
| --- | --- |
| `0001_init` | 13 tables, row level security, plan catalogue |
| `0002_checkin` | Door logic — `record_tap`, and `decide_tap` |
| `0003_harden_functions` | Pins `search_path`, closes RPC exposure |
| `0004_seed_demo` | Demo members, exercise library, a programme |
| `0005_coach_directory` | Lets a member see their coach's name only |
| `0006_phone_identities` | Phone identity for password sign-in |
| `0007_program_covers` | Cover photo per programme |
| `0008_media_buckets` | Thumbnail, avatar and gym photo buckets |
| `0009_username_auth` | Username sign-in, and admin account creation |
| `0010_diet_covers` | Cover photo per diet plan |
| `0011_demo_content` | Demo member's programme and diet; a photo per card |
| `0012_money_and_progress` | Payments, the agreed price, and body measurements |
| `0013_classes` | Group classes, booking, waitlist with automatic promotion |
| `0014_membership_freeze` | Freeze records; thawing adds the paused days back |
| `0015_announcements_and_leads` | Home-screen announcements, enquiry pipeline |
| `0016_training_history` | Members can read their own archived programmes |
| `0017_gyms` | Many gyms on one install, platform admins, per-gym isolation |
| `0018_class_kinds` | Class types for bodybuilding gyms and CrossFit boxes only |
| `0019_events` | Tournaments and events: sign-up, scores, leaderboards |
| `0020_banners_and_analyzer` | Photo banners on the home screen; the analyser's full readout |

Two things are deliberately unfinished:

- **`decide_tap` throws.** It encodes the gym's own door policy — whether
  a second tap is an exit, what happens on a double tap, whether a
  same-day return costs another session. Nobody outside the gym can
  answer that, so it fails loudly rather than guessing.
- **`admin_create_user` has two signatures on the live project.** The
  old four-argument one could not be dropped through the migration
  tooling, so `0017` turns it into a pass-through to the gym-aware one;
  the app always passes `p_gym` so the call is unambiguous.
- **Three linter warnings on `fc_role`, `fc_is_staff`, `fc_is_admin`.**
  These run inside RLS policy expressions, which Postgres evaluates as
  the querying role, so `authenticated` must keep EXECUTE or every policy
  using them errors. Documented in `0003`.

## Many gyms

One install serves several gyms. Every row carries a `gym_id`, set by a
trigger — from the member a row is about, from the parent row, or from
the staff member creating it — so no caller chooses it and a payment can
never be filed under another gym's member. Staff see only their own gym:
every policy that used to say "any staff" says `fc_staff_of(gym_id)`.

Amariya's own accounts are **platform admins** (`platform_admins`, no
gym of their own). They sign in at the same login and land on
**/platform**: every gym with its members, staff, live subscriptions and
30-day revenue; a form to open a new gym (it starts with a copy of the
first gym's plans, exercise library and settings); and per gym, its
switches and a form to create its first admin or coach.

A gym is `bodybuilding` or `crossfit`. A bodybuilding gym gets the app as
it was, group classes off. A CrossFit box gets classes (WOD, Olympic
lifting, gymnastics, HIIT, mobility, open gym) and competitions. Each
switch can be flipped per gym, and switching a gym off locks its people
out at `/suspended` without touching their data.

`0017` also closes a hole that predated it: the self-update policy on
`profiles` let a signed-in member set their own `role`. A trigger now
refuses role, username and gym changes from anyone not entitled to them.

## Tournaments and events

**مدیریت → مسابقه و رویداد** creates either a competition (CrossFit
throwdown, deadlift day, a 5 km run, a cycling race) or a plain event
(watching the match by the pool). Competitions take divisions (RX /
Scaled, men / women …) and a score type; the leaderboard ranks per
division the right way round — lowest time, most reps, heaviest lift.
Members sign up from **رویدادها** in the app until the closing time or
capacity; staff tick attendance and type scores (`12:34` for a time).

## Themes and day/night

Each gym picks a colour family at **مدیریت → ظاهر**: **آماریا** (the
default: brand blue `#004e98`, signal orange `#ff6700`, paper
`#ebebeb`, silver `#c0c0c0`, steel `#3a6ea5`), **کلاسیک فیروزه‌ای**
(the original look) or **گرافیت** (neutral with orange, for a CrossFit
box). Every family has a day and a night palette, and each person picks
روز، شب or خودکار (follow the phone) from their profile or account page.

The palettes are `[data-theme]` blocks in `app/globals.css` over one set
of token names. The family is stored per gym in `settings.theme`; the
personal mode is the `fc-mode` cookie. The root layout renders the right
palette for an explicit choice, and a tiny inline script resolves
"auto" from the system setting before first paint. Photos keep a dark
scrim in every palette; anything over one sits in `.fc-dark`.
`npm run check:contrast` measures all six palettes against WCAG AA.

## Logo

The Fit Club mark is drawn as SVG paths in `lib/brand-paths.ts`, used by
`components/brand/logo.tsx` on screen and by `npm run icons` for the
home-screen icons, so the two cannot drift. The runner is drawn in the
text colour, so it reads on light and dark grounds alike.

## Banners

A news item with a photo can go in the swipeable strip at the top of
the member's home screen (**مدیریت → اطلاعیه‌ها**). It may link to a
page in the app or an https address; anything else is refused in the
app and by the database. Photos upload into a folder named for the gym,
and storage policy keeps each gym's admin inside their own folder.

## Member profile

**پنل کاربری** (`/app/profile`, from the home screen) holds the member's
own details, a sign-out button, and two panels:

- **انرژی امروز**: the calorie target against today's spend, which is
  the resting rate × 1.2 plus what the gym recorded. The resting rate
  comes from the latest analyser test when there is one.
- **آنالیز بدن**: the body composition machine's readout (skeletal
  muscle, fat mass, body fat, BMR, visceral fat, water, protein,
  minerals, BMI, WHR, body score) with the change since the last test.
  Staff key it in from the printout; the database refuses an analyser
  row from a member and refuses analyser-only figures on any other row.

## Calories burned at the gym

The nutrition page shows what the member burned **at the gym** over the
last seven days, and nothing else: workouts ticked off against their
coach's programme, classes they were marked present in, and events they
attended. No watch or phone data — the coach writing the diet can't
verify it. MET values per class and event type are in `lib/gym-burn.ts`.
The figure is shown beside the daily target, not added to it: the target
already assumes the member's activity level.

## Testing

`npm test` covers the logic that has no database in it — the class
timetable rules, the owner's report arithmetic, the lead pipeline, the
programme suggester — with Node's built-in runner. No test framework to
install.

`npm run test:db` builds a fresh database from `supabase/tests/00_stubs.sql`
(minimal stand-ins for Supabase's `auth` and `storage` schemas, plus its
default API grants), applies every migration in order, and runs each
`supabase/tests/*.test.sql`. The tests sign in as different users with
`tests.act_as()` and check what row level security and the functions let
each of them do — a member booking a full class, a coach marking a
roster, an anonymous caller being refused. It needs a local Postgres:

```bash
PGHOST=/tmp/pg PGPORT=5433 PGUSER=postgres npm run test:db
```

## Classes

Group classes live in `class_sessions`, seats in `class_bookings`.
Nobody writes a booking directly: `book_class()` locks the session row,
counts seats and either books or queues, so two phones taking the last
place at once cannot both get it. When a seat frees up — a cancellation,
or staff raising the capacity — the waitlist is promoted in order,
skipping anyone whose subscription has lapsed since they joined it.

Members book from **کلاس** in the app, up to `class_booking_horizon_days`
ahead (14), and may give a seat up until `class_cancel_window_hours`
before the start (2); after that only the desk can. Coaches build the
timetable at **پنل مربی → کلاس‌ها**, optionally as a weekly run, and tick
attendance from half an hour before the class.

## Freezing a subscription

A freeze is a dated record in `membership_freezes`. Thawing it adds the
paused days to the expiry date, up to `freeze_max_days` (60) in total per
subscription. While frozen, the door and class booking both refuse the
subscription, and the member's home screen says so.

## Reports, leads and announcements

**مدیریت → گزارش‌ها** shows active, expiring, lapsed and frozen members,
revenue per Jalali month, outstanding balances, the renewal rate, the
busy hours from the door log, and how full each class ran. The arithmetic
is in `lib/analytics.ts` and unit-tested.

**مراجعه‌کننده‌ها** is the enquiry list: anyone who asked about joining,
with a follow-up date, so the desk works overdue calls first and the
owner can see how many enquiries become members.

**اطلاعیه‌ها** puts a notice on every member's home screen for exactly
the days it applies to.

## Photography

Four public Storage buckets carry the imagery:

| Bucket | What it holds | Who may write |
| --- | --- | --- |
| `program-covers` | The card a member opens each training day | Staff |
| `exercise-thumbs` | One frame per movement in the library | Admin |
| `avatars` | Coaches and members | Staff, or the owner |
| `gym-media` | The hall itself, for the public site | Admin |

Every slot is optional. A programme with no cover draws its own artwork,
seeded from its name, so two programmes never look alike — the gym can
add photography gradually rather than needing a library before any of
this works.

Two ways to fill them.

**Your own photos** are better than any stock library: members recognise
the room and the coach. Upload through the coach panel for covers, and
admin → حرکات for movements. One frame per movement, mid-rep rather than
a standing pose, landscape, and let the background stay dark — the cards
lay type over these and the scrim assumes a dim frame. A phone camera is
fine at these sizes.

**Stock, in bulk**, when the library is empty and opening day is close:

```bash
npm run photos -- --exercises          # one photo per movement, by muscle group
npm run photos -- --programs           # a cover for every published programme
npm run photos -- --query "squat rack" --bucket gym-media --count 5
npm run photos -- --exercises --dry-run   # search and report, upload nothing
```

It needs `PEXELS_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`, downloads to the bucket's aspect ratio, re-encodes as WebP,
and prefers darker frames because those sit better under the scrim.

The cover columns also accept an absolute URL, not just a bucket path.
That is how the library is currently filled — Unsplash frames hotlinked
from their CDN, which their licence allows and their CDN is built for.
Swapping one for a real photo of the gym is an UPDATE, not a migration.

Note that Unsplash's API guidelines ask for photographer attribution
wherever their photos are shown. Nothing in the UI credits them yet, so
either add that or replace these with the gym's own photography before
opening to members.

Pexels rather than Pinterest deliberately: the Pexels licence permits
commercial use, while a pin is a photographer's work that Pinterest was
never licensed to sub-license. A members' app is a commercial use.

## Money

`memberships` records which plan somebody is on. `payments` records what
they actually handed over. Keeping them apart is the whole point: a
member quoted four million who has paid two is not the same as a member
on a two-million plan, and one "paid" flag cannot tell them apart.

- **`memberships.price_toman`** — what was agreed, discount included,
  snapshotted at the point of sale for the same reason `sessions_total`
  already is. Editable afterwards from the member's file.
- **`payments`** — every instalment, with its method (نقدی، کارتخوان،
  کارت‌به‌کارت، سایر). A **refund is a negative amount**, so the
  end-of-day figure is a plain sum that cannot disagree with the drawer.
  `membership_id` is nullable, because the desk also sells lockers and
  single sessions and refusing to record that money is how a till stops
  balancing.
- **`membership_ledger`** — a `security_invoker` view giving price, paid
  and balance, so no screen re-derives that join and gets it subtly
  different. `security_invoker` matters: without it the view would hand
  any signed-in member the whole gym's ledger.

Staff record payments on a member's file; **admin → صندوق** shows today's
takings split by method, the last thirty days, and who still owes. Money
is readable by the member it belongs to and writable only by staff —
nobody records their own payment.

## Progress

`profiles.weight_kg` was one number overwritten in place, so the app knew
today's weight and had no idea it used to be anything else.
`body_metrics` keeps the history.

One table serves both the member's bathroom scale and the gym's body
composition machine, because it is one history and the chart should draw
one line. A `source` column (`self` / `analyzer` / `coach`) says which,
and **row level security pins it**: a member may write their own weight
as `self` and nothing else. Letting them publish a reading as the
analyser's would make the one trustworthy measurement in the table
untrustworthy.

Analyser fields — body fat, muscle mass, body water, bone mass, visceral
fat, metabolic age, BMR — plus six tape measurements, all nullable,
because no two machines print the same set and a tape prints none of
them. Every numeric column carries a sanity range: one 840 kg reading
flattens the chart and the member concludes the app is broken.

A trigger keeps `profiles.weight_kg` on the newest reading, so the
calorie target in `lib/nutrition.ts` follows the member's actual weight.
Only the newest wins — back-filling last month's weigh-in cannot rewrite
today's.

The member sees it at **پیشرفت**: one weight chart, the latest analyser
results against the test before, and strength records read back out of
`workout_logs`, which had been collecting weights that nothing ever
displayed. Sparse analyser data is shown as figures rather than a
two-point chart.

Nothing is charted that is not also written down — the reading list under
the chart is its table view, which is what keeps values from being
reachable only by hovering on a phone.

## Reading a meal

`lib/food-estimate.ts` turns a meal written in ordinary Persian into
calories and macros. A member uses it at **تغذیه → محاسبه‌گر کالری**; a
coach uses the same reader from the diet builder, where **حساب کن** next
to a meal fills in that meal's figure from the text they just typed.

    «۲ عدد تخم‌مرغ با یک کف دست نان سنگک و نصف لیوان شیر»  →  ≈۳۰۹ کالری

Three passes: normalise, so one word has one spelling; pull the amount
and the household measure out of each phrase; match what is left against
the 131 foods in `lib/food-table.ts`, Iranian dishes included.

It is a lookup and some arithmetic, not a model call — no key, no
request, no bill, and it still works with the installed app offline. The
trade is that it knows the table and nothing else. Four things follow
from that, and they are the parts worth not undoing:

- **Per 100 g, with portion weights on top.** The only way to compare a
  skewer of kebab with a spoon of oil, and it makes «two eggs», «half a
  glass» and «150 grams» the same arithmetic. A food overrides any
  measure the general default gets wrong: one date is 8 g, not 100.
- **Containment is checked one way only.** A phrase may contain a food's
  name, never the reverse — otherwise «سیب» reads as «سیب زمینی سرخ
  کرده» and the answer is out by a factor of five. Among the names a
  phrase does contain, the longest wins.
- **It answers with a band.** A reference table against a real plate is
  worth about ±12%; guessing the portion costs more than guessing the
  food, so the spread widens with both and the confidence chip follows.
- **Unmatched phrases are listed, never dropped.** A silently missing
  item is a wrong total that looks right.

Adding a food is one line in `FOODS`: per-100 g figures, a typical
serving, aliases for what people actually say, and portion weights for
any measure the defaults would get wrong.

## Design

Dark-first, by choice rather than by default: the brand mark is a
cyan-to-navy gradient that only reads on a deep ground.

Every colour pair the interface uses is measured, not eyeballed —
`npm run check:contrast` parses the tokens straight out of
`app/globals.css` and fails the build below 4.5:1. Raised panels use
`--fc-muted` for secondary text, never `--fc-dim`: a blue-grey that
clears AA on the page ground drops to 2.64:1 on navy.
