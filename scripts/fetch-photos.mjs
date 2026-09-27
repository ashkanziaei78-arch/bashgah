/* Fills the gym's photo buckets from Pexels.
 *
 * Why this is a script you run rather than something the app does:
 * the machine this repository is developed on reaches the open internet;
 * the sandbox the assistant runs in does not. Everything here needs a
 * network the assistant cannot use, so it runs on yours.
 *
 * Why Pexels and not Pinterest: the Pexels licence allows commercial use
 * with no attribution, which is what a paying gym's app needs. Pinterest
 * is a bookmarking site — the photographer never licensed those images
 * to it, and a pin in your members' app is someone else's work.
 *
 *   PEXELS_API_KEY=...  free key from pexels.com/api
 *   SUPABASE_SERVICE_ROLE_KEY=...  server-side only, never NEXT_PUBLIC_
 *
 * Usage:
 *   node scripts/fetch-photos.mjs --exercises
 *       one photo per movement in the library, searched by muscle group,
 *       written into exercise-thumbs and wired to exercises.thumb_path
 *
 *   node scripts/fetch-photos.mjs --programs
 *       a cover for every published programme without one
 *
 *   node scripts/fetch-photos.mjs --query "squat rack" --bucket gym-media --count 5
 *       free-form, saves to the bucket and prints the paths
 *
 *   ...--dry-run    search and report, upload nothing
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// ---------------------------------------------------------------
// env
// ---------------------------------------------------------------

/** Reads .env.local the way Next.js does, so the script needs no flags
 *  and no second copy of the credentials. */
function loadEnv() {
  for (const file of [".env.local", ".env.production"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}
loadEnv();

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ---------------------------------------------------------------
// args
// ---------------------------------------------------------------

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY = has("--dry-run");

/* Landscape only, and large enough that the card still looks sharp on a
 * 3x phone screen after the crop. */
const TARGET = {
  "exercise-thumbs": { width: 900, height: 600, quality: 78 },
  "program-covers": { width: 1600, height: 1000, quality: 80 },
  "gym-media": { width: 2000, height: 1200, quality: 82 },
  avatars: { width: 600, height: 600, quality: 82 },
};

// ---------------------------------------------------------------
// pexels
// ---------------------------------------------------------------

async function search(query, count) {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(count * 3, 80)));
  url.searchParams.set("orientation", "landscape");

  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) {
    // A 403 here is usually a bad key, but a corporate proxy or VPN that
    // blocks the host reports the same status, so name both rather than
    // sending someone to regenerate a key that was fine.
    throw new Error(
      `Pexels returned ${res.status} for "${query}".\n` +
        "Either PEXELS_API_KEY is wrong, or this network blocks api.pexels.com."
    );
  }

  const { photos = [] } = await res.json();
  // Darker frames sit better under the app's scrim, and Pexels reports
  // an average colour per photo, so prefer the dim ones for free.
  return photos
    .map((p) => ({ ...p, lum: luminance(p.avg_color) }))
    .sort((a, b) => a.lum - b.lum)
    .slice(0, count);
}

function luminance(hex) {
  if (!hex) return 1;
  const n = parseInt(hex.slice(1), 16);
  return (
    (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
  );
}

/** Downloads, crops to the bucket's shape and re-encodes as WebP.
 *  A 6MB Pexels original would blow the bucket's size limit and waste a
 *  member's data on a 52px thumbnail. */
async function prepare(photo, bucket) {
  const spec = TARGET[bucket];
  const res = await fetch(photo.src.large2x ?? photo.src.large);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);

  return sharp(Buffer.from(await res.arrayBuffer()))
    .resize(spec.width, spec.height, { fit: "cover", position: "attention" })
    .webp({ quality: spec.quality })
    .toBuffer();
}

// ---------------------------------------------------------------
// supabase
// ---------------------------------------------------------------

const db =
  SUPABASE_URL && SERVICE_KEY
    ? createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    : null;

async function upload(bucket, buffer, name) {
  const { error } = await db.storage
    .from(bucket)
    .upload(name, buffer, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw new Error(`upload ${name}: ${error.message}`);
  return name;
}

// ---------------------------------------------------------------
// modes
// ---------------------------------------------------------------

/** Movement photos, searched per muscle group rather than per exercise
 *  name: "کراس اور سیم‌کش" returns nothing on an English stock library,
 *  while its muscle group maps cleanly onto one. */
const GROUP_QUERY = {
  "سینه": "bench press gym chest workout",
  "پشت": "back workout pull up gym",
  "پا": "squat leg workout gym",
  "شانه": "shoulder press dumbbell gym",
  "بازو": "biceps curl dumbbell gym",
  "شکم": "core abs workout gym",
};

async function fillExercises() {
  const { data, error } = await db
    .from("exercises")
    .select("id, name, muscle_group, thumb_path");
  if (error) throw new Error(error.message);

  const todo = data.filter((e) => !e.thumb_path);
  if (todo.length === 0) return console.log("Every movement already has a photo.");

  // One search per group, not per exercise — 10 movements in one group
  // would otherwise burn 10 API calls for the same query.
  const groups = [...new Set(todo.map((e) => e.muscle_group))];
  console.log(`${todo.length} movement(s) without a photo, across ${groups.length} group(s).`);

  for (const group of groups) {
    const mine = todo.filter((e) => e.muscle_group === group);
    const query = GROUP_QUERY[group] ?? `${group} gym workout`;
    const photos = await search(query, mine.length);

    if (photos.length === 0) {
      console.log(`  ${group}: nothing found for "${query}" — skipped`);
      continue;
    }

    for (const [i, exercise] of mine.entries()) {
      // Fewer photos than movements: cycle rather than leave gaps.
      const photo = photos[i % photos.length];
      if (DRY) {
        console.log(`  [dry] ${exercise.name} <- ${photo.photographer}, ${photo.url}`);
        continue;
      }

      const buffer = await prepare(photo, "exercise-thumbs");
      const path = await upload("exercise-thumbs", buffer, `${exercise.id}.webp`);
      const { error: upErr } = await db
        .from("exercises")
        .update({ thumb_path: path })
        .eq("id", exercise.id);
      if (upErr) throw new Error(upErr.message);
      console.log(`  ${exercise.name} <- ${photo.photographer}`);
    }
  }
}

async function fillPrograms() {
  const { data, error } = await db
    .from("programs")
    .select("id, title, cover_path, status")
    .eq("status", "published");
  if (error) throw new Error(error.message);

  const todo = data.filter((p) => !p.cover_path);
  if (todo.length === 0) return console.log("Every programme already has a cover.");

  const photos = await search("dark gym interior weights training", todo.length);
  for (const [i, program] of todo.entries()) {
    const photo = photos[i % photos.length];
    if (!photo) break;
    if (DRY) {
      console.log(`  [dry] ${program.title} <- ${photo.photographer}, ${photo.url}`);
      continue;
    }

    const buffer = await prepare(photo, "program-covers");
    const path = await upload("program-covers", buffer, `${program.id}.webp`);
    const { error: upErr } = await db
      .from("programs")
      .update({ cover_path: path })
      .eq("id", program.id);
    if (upErr) throw new Error(upErr.message);
    console.log(`  ${program.title} <- ${photo.photographer}`);
  }
}

async function freeForm() {
  const query = valueOf("--query");
  const bucket = valueOf("--bucket", "gym-media");
  const count = Number(valueOf("--count", "5"));

  if (!TARGET[bucket]) {
    throw new Error(`Unknown bucket "${bucket}". One of: ${Object.keys(TARGET).join(", ")}`);
  }

  const photos = await search(query, count);
  console.log(`${photos.length} photo(s) for "${query}" -> ${bucket}`);

  for (const photo of photos) {
    if (DRY) {
      console.log(`  [dry] ${photo.photographer}, ${photo.url}`);
      continue;
    }
    const buffer = await prepare(photo, bucket);
    const name = await upload(bucket, buffer, `${query.replace(/\W+/g, "-")}-${photo.id}.webp`);
    console.log(`  ${name}  (${photo.photographer})`);
  }
}

// ---------------------------------------------------------------

async function main() {
  if (!PEXELS_KEY) {
    console.error(
      "PEXELS_API_KEY is not set.\n" +
        "Get a free key at https://www.pexels.com/api/ and add it to .env.local."
    );
    process.exit(2);
  }
  if (!DRY && !db) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both needed to upload.\n" +
        "The service role key bypasses row level security — keep it in .env.local, never in the repo.\n" +
        "Re-run with --dry-run to search without uploading."
    );
    process.exit(2);
  }

  if (has("--exercises")) await fillExercises();
  else if (has("--programs")) await fillPrograms();
  else if (valueOf("--query")) await freeForm();
  else {
    console.log(
      "Pick a mode:\n" +
        "  --exercises              a photo for every movement missing one\n" +
        "  --programs               a cover for every published programme missing one\n" +
        '  --query "..." [--bucket gym-media] [--count 5]\n' +
        "  --dry-run                search and report, upload nothing"
    );
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
