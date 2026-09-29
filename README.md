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

`npm run verify` runs the three gates together: contrast measurement,
lint, and build. Run it before pushing.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run verify` | Contrast + lint + build |
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

Two things are deliberately unfinished:

- **`decide_tap` throws.** It encodes the gym's own door policy — whether
  a second tap is an exit, what happens on a double tap, whether a
  same-day return costs another session. Nobody outside the gym can
  answer that, so it fails loudly rather than guessing.
- **Three linter warnings on `fc_role`, `fc_is_staff`, `fc_is_admin`.**
  These run inside RLS policy expressions, which Postgres evaluates as
  the querying role, so `authenticated` must keep EXECUTE or every policy
  using them errors. Documented in `0003`.

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
