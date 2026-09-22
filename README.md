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

## Sign-in

Members sign in with a **username and a password**. Supabase
authenticates against an email or a phone, never a free-form username, so
each username maps to a fixed internal address:

```
<username>@fitclub.invalid
```

The client derives that address locally, so there is no lookup endpoint a
stranger could use to test which usernames exist. `.invalid` is reserved
by RFC 2606 for addresses that must never resolve, so no mail can reach
one by accident. Members never see it.

The phone number lives on the same account. It is what sign-up collects,
and once sms.ir is wired it becomes a second way into the same account
rather than a second account.

### Wiring sms.ir for SMS codes

Supabase has no built-in Iranian SMS provider. Delivery goes through an
auth **Send SMS hook**: Supabase calls an Edge Function whenever it needs
to send a code, and that function calls sms.ir. Set `SMSIR_API_KEY` and
`SMSIR_TEMPLATE_ID`, then point the hook at the function in
**Authentication → Hooks**, and enable the Phone provider.

Password sign-in needs none of that.

## Accounts

The front desk creates member accounts; there is no public sign-up. A
member who forgets their password asks reception to reset it.

`/dev-login` offers one-tap sign-in to the demo accounts. It returns 404
when `NODE_ENV` is production, so it never ships.

## The public demo

`/demo` is a walkthrough of the member app with no account: home,
workout, nutrition and progress, driven by fixtures in `lib/demo-data.ts`.

Unlike `/dev-login` it ships to production on purpose — it is what a
prospective member is sent when they ask what the app actually looks
like, and answering that with a login wall loses them.

It mounts the *same* components the signed-in app does, with
`persist={false}` on the exercise list so nothing is written. That is
deliberate: a demo built from separate markup drifts into a prettier
mock-up of a product that does not behave that way.

## Exercise videos

`exercises.video_path` is a path in the public `exercise-videos` bucket,
created in migration `0009`. The bucket is public because these are
clips of a barbell, not member data, and signing each one would cost a
round trip per exercise over the worst signal in the building.

**No videos ship with the app.** The gym films its own and uploads them —
which is also the honest option, since clips taken from other sites are
someone else's copyright. Until a row has a `video_path`, the exercise
sheet says so plainly instead of pretending a video is loading.

## Database

Migrations live in `supabase/migrations`, applied in order.

| Migration | What it adds |
| --- | --- |
| `0001_init` | 13 tables, row level security, plan catalogue |
| `0002_checkin` | Door logic — `record_tap`, and `decide_tap` |
| `0003_harden_functions` | Pins `search_path`, closes RPC exposure |
| `0004_seed_demo` | Demo members, exercise library, a programme |
| `0005_coach_directory` | Lets a member see their coach's name only |
| `0006_phone_identities` | Phone identity, so one person has one account |
| `0007_usernames` | Username column and the internal address mapping |
| `0008_seed_real_programmes` | Real training programmes and exercises |
| `0009_exercise_video_storage` | The `exercise-videos` bucket and its policies |

Two things are deliberately unfinished:

- **`decide_tap` throws.** It encodes the gym's own door policy — whether
  a second tap is an exit, what happens on a double tap, whether a
  same-day return costs another session. Nobody outside the gym can
  answer that, so it fails loudly rather than guessing.
- **Three linter warnings on `fc_role`, `fc_is_staff`, `fc_is_admin`.**
  These run inside RLS policy expressions, which Postgres evaluates as
  the querying role, so `authenticated` must keep EXECUTE or every policy
  using them errors. Documented in `0003`.

## Design

Dark-first, by choice rather than by default: the brand mark is a
cyan-to-navy gradient that only reads on a deep ground.

Every colour pair the interface uses is measured, not eyeballed —
`npm run check:contrast` parses the tokens straight out of
`app/globals.css` and fails the build below 4.5:1. Raised panels use
`--fc-muted` for secondary text, never `--fc-dim`: a blue-grey that
clears AA on the page ground drops to 2.64:1 on navy.
