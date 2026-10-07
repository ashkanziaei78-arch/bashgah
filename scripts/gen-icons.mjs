/* Generates the PWA icon set from the Fit Club mark.
 *
 * Why paths and not text: librsvg (what sharp renders SVG with) has no
 * access to Vazirmatn or Archivo, so any <text> would silently fall back
 * to a system face and the icon would differ per machine. Stroked paths
 * render identically everywhere.
 *
 *   node scripts/gen-icons.mjs
 */
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";

// The mark's paths live in lib/brand-paths.ts so the on-screen logo and
// these icons share one source. Read as text: this script runs on plain
// node, without a TypeScript loader.
const SRC = await readFile(new URL("../lib/brand-paths.ts", import.meta.url), "utf8");
const BODY = SRC.match(/LOGO_BODY = "([^"]+)"/)[1];
const BARS = [...SRC.matchAll(/^\s+"(M[^"]+)",$/gm)].map((m) => m[1]);
const HEAD = { cx: 400, cy: 118, r: 61 };
if (BARS.length !== 3) throw new Error("expected three bar paths in lib/brand-paths.ts");

const OUT = "public/icons";

/** @param {number} size @param {number} inset 0-1, share of canvas the mark occupies */
function svg(size, inset, radius) {
  const glyph = size * inset;
  const offset = (size - glyph) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="1" y2="0.15">
      <stop offset="0" stop-color="#0a50d2"/><stop offset="0.28" stop-color="#05a0e4"/>
      <stop offset="0.6" stop-color="#0cc6b6"/><stop offset="1" stop-color="#22e874"/>
    </linearGradient>
    <linearGradient id="h" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22f0d0"/><stop offset="1" stop-color="#14d68a"/>
    </linearGradient>
    <mask id="m" maskUnits="userSpaceOnUse" x="-20" y="-20" width="700" height="700">
      <rect x="-20" y="-20" width="700" height="700" fill="#fff"/>
      <path d="${BODY}" fill="#000" stroke="#000" stroke-width="18" stroke-linejoin="round"/>
      <circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r + 11}" fill="#000"/>
    </mask>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="#061527"/>
  <g transform="translate(${offset} ${offset}) scale(${glyph / 650}) translate(10 10)">
    <g mask="url(#m)" fill="url(#g)">${BARS.map((d) => `<path d="${d}"/>`).join("")}</g>
    <path d="${BODY}" fill="#ffffff"/>
    <circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="url(#h)"/>
  </g>
</svg>`;
}

async function write(name, size, inset, radius) {
  await sharp(Buffer.from(svg(size, inset, radius))).png().toFile(`${OUT}/${name}`);
  console.log("wrote", `${OUT}/${name}`);
}

await mkdir(OUT, { recursive: true });

// Standard icons: rounded, glyph fills most of the tile.
await write("icon-192.png", 192, 0.72, 42);
await write("icon-512.png", 512, 0.72, 112);

// Maskable: Android crops to a circle, so keep the glyph inside the
// inner 80% safe zone and let the gradient bleed to every edge.
await write("maskable-512.png", 512, 0.56, 0);

// Apple touch icon: iOS applies its own mask, so ship a full-bleed square.
await write("apple-icon.png", 180, 0.7, 0);
