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
| Latin labels and figures | Archivo | 600 / 700 / 800, uppercase, tracked |

Numerals use `font-variant-numeric: tabular-nums` wherever they line up
in a column, so weights and times do not jitter as they change.

## Verifying it

```bash
npm run check:contrast   # every pair the UI uses, against WCAG 2.2 AA
npm run check:colors     # no literal may re-enter the codebase
```

The contrast script parses the tokens out of `app/globals.css` rather
than keeping its own copy. An earlier version kept a copy and passed
happily while the real stylesheet failed.
