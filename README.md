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

A member's **mobile number is their username**. Two ways in, both landing
on the same account:

1. **Mobile + password** — works without any SMS provider.
2. **Mobile + SMS code** — needs the hook below.

Both require the Phone provider to be switched on:
**Supabase dashboard → Authentication → Sign In / Providers → Phone → enable.**
Password sign-in does not send an SMS, so it works the moment that toggle
is on, with no SMS account of any kind.

Keeping both methods on one phone identity matters. Signing in by OTP
creates a phone identity; a synthesised email like
`09123456789@example.com` would create a separate one, and the same
person would end up with two accounts the first time they switched
method.

### Wiring sms.ir for the SMS code

Supabase has no built-in Iranian SMS provider. Delivery goes through an
auth **Send SMS hook**: Supabase calls an Edge Function whenever it needs
to send a code, and that function calls sms.ir. Set `SMSIR_API_KEY` and
`SMSIR_TEMPLATE_ID`, then point the hook at the function in
**Authentication → Hooks**.

Until that hook exists, the "SMS code" tab returns a clear error and the
password tab keeps working.

## Accounts

The front desk creates member accounts; there is no public sign-up. A
member who forgets their password asks reception to reset it.

`/dev-login` offers one-tap sign-in to the demo accounts. It returns 404
when `NODE_ENV` is production, so it never ships.

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
