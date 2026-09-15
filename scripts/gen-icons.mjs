/* Generates the PWA icon set from vector paths.
 *
 * Why paths and not text: librsvg (what sharp renders SVG with) has no
 * access to Vazirmatn or Archivo, so any <text> would silently fall back
 * to a system face and the icon would differ per machine. Stroked paths
 * render identically everywhere.
 *
 *   node scripts/gen-icons.mjs
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const OUT = "public/icons";

/** @param {number} size @param {number} inset 0-1, share of canvas the glyph occupies */
function svg(size, inset, radius) {
  const glyph = size * inset;
  const offset = (size - glyph) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#00B2E3"/>
      <stop offset="55%" stop-color="#1565A8"/>
      <stop offset="100%" stop-color="#0C2B52"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(${offset} ${offset}) scale(${glyph / 24})"
     fill="none" stroke="#FFFFFF" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round">
    <path d="M7 4.5v15M17 4.5v15M3 9v6M21 9v6M7 12h10"/>
  </g>
</svg>`;
}

async function write(name, size, inset, radius) {
  await sharp(Buffer.from(svg(size, inset, radius))).png().toFile(`${OUT}/${name}`);
  console.log("wrote", `${OUT}/${name}`);
}

await mkdir(OUT, { recursive: true });

// Standard icons: rounded, glyph fills most of the tile.
await write("icon-192.png", 192, 0.6, 42);
await write("icon-512.png", 512, 0.6, 112);

// Maskable: Android crops to a circle, so keep the glyph inside the
// inner 80% safe zone and let the gradient bleed to every edge.
await write("maskable-512.png", 512, 0.46, 0);

// Apple touch icon: iOS applies its own mask, so ship a full-bleed square.
await write("apple-icon.png", 180, 0.6, 0);
