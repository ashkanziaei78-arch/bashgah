/* Fails when a colour is written as a literal instead of a token.
 *
 * A redesign is only finished when every page consumes the one theme. The
 * first pass through this codebase left thirteen literals behind — the
 * palette changed and those spots silently kept the old colours.
 *
 *   node scripts/check-hardcoded-colors.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["app", "components", "lib"];
/** The only file allowed to hold a brand literal — see its header.
 *  Compared on forward slashes so this works on Windows too. */
const EXEMPT = new Set(["lib/brand.ts"]);
const EXTS = new Set([".ts", ".tsx"]);

/** Colour literals: #rgb, #rrggbb, rgb(), rgba(), hsl(), hsla(). */
const LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(/g;

/** Places a literal is legitimate. */
const ALLOWED = [
  // Tailwind opacity shorthand on a token, e.g. bg-fc-ok/12
  /\/\d{1,3}\b/,
  // Pure black/white scrims are intentionally theme-independent
  /#fff\b|#ffffff\b|#000\b|#000000\b/i,
];

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXTS.has(extname(entry))) continue;
    if (EXEMPT.has(full.replaceAll("\\", "/"))) continue;

    const lines = readFileSync(full, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!LITERAL.test(line)) return;
      LITERAL.lastIndex = 0;
      if (ALLOWED.some((ok) => ok.test(line))) return;
      // var(--color-fc-*) and var(--fc-*) are the whole point — not literals.
      const stripped = line.replace(/var\(--[a-z0-9-]+\)/g, "");
      if (!LITERAL.test(stripped)) {
        LITERAL.lastIndex = 0;
        return;
      }
      LITERAL.lastIndex = 0;
      offenders.push({ file: `${full}:${i + 1}`, line: line.trim().slice(0, 90) });
    });
  }
}

for (const root of ROOTS) walk(root);

if (offenders.length === 0) {
  console.log("No hardcoded colours — every surface reads from the token system.");
  process.exit(0);
}

console.log(`${offenders.length} hardcoded colour(s):`);
for (const o of offenders) console.log(`  ${o.file}\n    ${o.line}`);
process.exit(1);
