# Fit Club — Floodlit Slate

The theme the app ships. Built for this brand rather than picked from a
set, because the logo fixes the accent and nothing off-the-shelf matched
it.

## The problem it solves

The first palette put a saturated navy (`#0C2B52`) behind a saturated
cyan (`#00B2E3`). Two saturated colours fight: neither has anything to
stand against, and the whole app reads as one flat blue field. Premium
dark interfaces do the opposite — a near-neutral ground with exactly one
saturated accent, so the accent looks chosen rather than inherited.

So the grounds were desaturated to slate and the accent left untouched.
The cyan is now the only saturated thing on screen.

## Colour

| Token | Value | Role |
| --- | --- | --- |
| `--color-fc-ink` | `#080b11` | Page ground. Near-black slate, a whisper of blue. |
| `--color-fc-ink2` | `#0f141c` | Cards and list surfaces. |
| `--color-fc-navy` | `#161d28` | Raised panel, lower stop. |
| `--color-fc-navy2` | `#1f2937` | Raised panel, upper stop. Input wells. |
| `--color-fc-cyan` | `#00b2e3` | The accent. Taken from the logo, never altered. |
| `--color-fc-cyan-lift` | `#69d8f5` | Second stop of the headline gradient only. |
| `--color-fc-text` | `#eaf0f7` | Body copy. |
| `--color-fc-muted` | `#9cb0c6` | Secondary copy. The only secondary allowed on raised panels. |
| `--color-fc-dim` | `#6f8499` | Captions and meta, on flat grounds only. |
| `--color-fc-ok` | `#34d399` | Gains, completions. |
| `--color-fc-warn` | `#fbbf24` | Time running out. |
| `--color-fc-bad` | `#fb7185` | Errors. |

Two non-colour tokens carry the rest: `--fc-line` / `--fc-line2` for
rules and borders, `--fc-track` for the empty half of any progress bar.

## Type scale

The first pass sized text ad hoc — 10.5, 11, 11.5, 12.5, 13, 13.5, 14.5,
17px. Nothing lined up, and everything under 12px was guesswork on a
phone. This is now the whole set the UI may use:

| Token | Size | Role |
| --- | --- | --- |
| `text-2xs` | 11px | Tracked uppercase **Latin** micro-labels only |
| `text-xs` | 12px | Captions, meta, tab labels |
| `text-sm` | 13px | Secondary copy |
| `text-base` | 15px | Body |
| `text-md` | 16px | Emphasis, list titles |
| `text-lg` | 18px | Screen titles |
| `text-xl` | 22px | Section heroes |
| `text-2xl` | 28px | Stat-tile figures |
| `text-3xl` | 38px | The one number a screen is about |
| `text-4xl` | 52px | Landing headline |

No Persian text is set below 12px. `text-2xs` exists for tracked Latin
labels, where the uppercase forms stay legible smaller.

## Elevation

On a near-black ground a drop shadow alone does almost nothing; what
separates a surface is the one-pixel lit top edge. Each level therefore
pairs a shadow with an inset highlight, and these three are the only ones
in use: `--fc-e1` (cards), `--fc-e2` (raised panels, hover), `--fc-e3`
(the hero panel of a screen).

## Motion

Three durations — `--fc-fast` 140ms, `--fc-mid` 240ms, `--fc-slow` 460ms
— and two curves. `--fc-spring` overshoots slightly and belongs on things
that *appear*; `--fc-out` does not and belongs on things that merely
*change*.

All of it is entrance-only: nothing moves on its own after first paint,
and the whole layer is disabled under `prefers-reduced-motion`.

Below-the-fold landing sections cannot use a load-time entrance — by the
time they are seen it has finished — so they use `components/reveal`,
which adds the hidden state *in an effect*. A visitor whose JavaScript
never runs, or whose browser has no `IntersectionObserver`, gets the page
fully rendered rather than a column of invisible sections, and a 6-second
failsafe guarantees nothing is ever stranded hidden.

## Progress fills

`--fc-grad` runs cyan → blue → near-black navy. On a 6px bar that dark
tail is indistinguishable from the empty track, so a bar reads as less
full than it is — on a rest countdown, actively misleading. Progress
fills use `--fc-grad-bar`, which stops at the blue. `--fc-grad` keeps its
full range for the logo and the avatar, where the dark end is the point.

## Rules that are not negotiable

**Raised panels take `--fc-muted`, never `--fc-dim`.** A blue-grey that
clears AA on the page ground drops to 2.64:1 on a raised one. This is the
single easiest way to reintroduce a contrast failure.

**The primary button is solid cyan with a dark label**, measuring 7.71:1.
White on the gradient measured 2.48:1 — it failed AA and read as a
template at the same time. The gradient survives only where no text sits
on it: the logo mark, progress fills, the check-in ring.

**Every colour comes from a token.** `npm run check:colors` fails the
build on a literal. The one exception is `lib/brand.ts`, which holds the
ground colour for `theme-color` and the web manifest — the browser reads
both before any CSS loads, so a `var()` cannot resolve there.

## Typography

| Role | Face | Notes |
| --- | --- | --- |
| Persian, all weights | Vazirmatn | 400 / 500 / 700 / 900 |
| Persian figures | Vazirmatn | `.fc-num` / `.fc-figure`, tabular |
| Latin labels | Barlow Condensed | 500–800, uppercase, tracked |

Numerals use `font-variant-numeric: tabular-nums` wherever they line up
in a column, so weights and times do not jitter as they change.

**Figures stay on Vazirmatn, not on the Latin face.** Barlow Condensed
carries no Persian digits, so ۰-۹ set in it fall back silently to
whatever the system offers — which loses tabular alignment and mixes two
sets of metrics inside a single number. Vazirmatn has the digits and
honours `tabular-nums`.

**Never letter-space Persian.** It is a cursive script: its letters join,
and tracking pulls those joins apart into something that reads as broken,
or as a different letter entirely. `.fc-lat` and `.fc-eyebrow-lat` carry
the tracked uppercase treatment and may only wrap genuinely Latin runs —
the brand lockup, an ASCII label. `.fc-eyebrow` on its own is
script-neutral and is what Persian eyebrows use.

## Verifying it

```bash
npm run check:contrast   # every pair the UI uses, against WCAG 2.2 AA
npm run check:colors     # no literal may re-enter the codebase
```

The contrast script parses the tokens out of `app/globals.css` rather
than keeping its own copy. An earlier version kept a copy and passed
happily while the real stylesheet failed.
