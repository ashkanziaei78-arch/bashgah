/* Measures every foreground/background pair the Fit Club UI actually uses
 * against WCAG 2.2 AA.
 *
 * Tokens are parsed out of app/globals.css rather than copied here. A
 * checker that keeps its own copy of the palette passes happily while the
 * real stylesheet fails — which is exactly what happened the first time.
 *
 *   node scripts/check-contrast.mjs
 */
import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const TOKEN = Object.fromEntries(
  [...CSS.matchAll(/--color-fc-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)].map(
    ([, name, hex]) => [name, hex.toLowerCase()]
  )
);
TOKEN.white = "#ffffff";

for (const required of [
  "ink", "ink2", "navy", "navy2", "cyan", "text", "muted", "dim",
  "glass", "glass2",
]) {
  if (!TOKEN[required]) {
    console.error(`Token --color-fc-${required} not found in app/globals.css`);
    process.exit(2);
  }
}

function channel(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function ratio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground, background, where it appears, minimum required] */
const PAIRS = [
  ["text", "ink", "body copy on the page ground", 4.5],
  ["text", "ink2", "body copy inside a card", 4.5],
  ["text", "navy2", "body copy on a raised panel", 4.5],
  ["muted", "ink", "secondary copy on the page ground", 4.5],
  ["muted", "ink2", "secondary copy inside a card", 4.5],
  // Rule: raised panels use `muted`, never `dim`. A blue-grey that clears
  // AA on the page ground drops to 2.64:1 on navy.
  ["muted", "navy2", "captions on a raised panel", 4.5],
  ["dim", "ink", "captions and meta on the page ground", 4.5],
  ["dim", "ink2", "captions and meta inside a card", 4.5],
  ["cyan", "ink", "links, eyebrows, active tab label", 4.5],
  ["cyan", "ink2", "accent numerals inside a card", 4.5],
  ["ok", "ink2", "success figures", 4.5],
  ["warn", "ink2", "warning figures", 4.5],
  ["bad", "ink2", "error text", 4.5],
  ["text", "navy", "label on the brand navy surface", 4.5],
  ["ink", "cyan", "primary button label on solid cyan", 4.5],
  // Glass. --color-fc-glass/glass2 are the opaque colours the translucent
  // panels composite to over the brightest ambient point — see the note
  // beside them in globals.css. Measuring those is what stops a glass
  // redesign from quietly walking through this gate.
  //
  // Same rule as raised panels, and for the same reason: `dim` on glass
  // measures 4.25:1, so secondary text on glass is `muted`.
  ["text", "glass", "body copy on a glass panel", 4.5],
  ["muted", "glass", "secondary copy on a glass panel", 4.5],
  ["cyan", "glass", "accent numerals on a glass panel", 4.5],
  ["text", "glass2", "body copy on a raised glass panel", 4.5],
  ["muted", "glass2", "captions on a raised glass panel", 4.5],
  ["cyan", "glass2", "accent numerals on a raised glass panel", 4.5],
  ["ok", "glass2", "success figures on glass", 4.5],
  ["bad", "glass2", "error text on glass", 4.5],
  // Empty-state icons on a raised panel are drawn in `dim`. As a
  // non-text graphic the bar is 3.0, which it clears — but it is only
  // ever an icon there, never a caption.
  ["dim", "glass2", "empty-state icon strokes on glass", 3.0],
  ["cyan", "ink", "focus ring against the ground", 3.0],
  ["muted", "ink", "icon strokes and dividers", 3.0],
];

let failures = 0;
const rows = PAIRS.map(([fg, bg, where, min]) => {
  const r = ratio(TOKEN[fg], TOKEN[bg]);
  const pass = r >= min;
  if (!pass) failures++;
  return {
    pair: `${fg} on ${bg}`,
    ratio: r.toFixed(2),
    need: min.toFixed(1),
    verdict: pass ? "pass" : "FAIL",
    where,
  };
});

console.table(rows);
console.log(
  failures === 0
    ? `All ${rows.length} measured pairs meet WCAG 2.2 AA.`
    : `${failures} pair(s) below the AA threshold.`
);
process.exit(failures === 0 ? 0 : 1);
