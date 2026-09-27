/** Public Storage URLs.
 *
 *  Every media bucket is public, so the address is predictable and needs
 *  no client, no round trip and no signing — which matters because these
 *  render inside server components on nearly every screen, and because a
 *  signed URL expires out from under the service worker's cache.
 */

/** The buckets created in migrations 0007 and 0008. */
export type MediaBucket =
  | "program-covers"
  | "exercise-thumbs"
  | "avatars"
  | "gym-media";

const PUBLIC_BASE = "/storage/v1/object/public";

export function publicUrl(
  bucket: MediaBucket,
  path: string | null | undefined
): string | null {
  if (!path) return null;

  // An absolute URL is used as-is. Photography can come from a stock
  // library as a hotlink before the gym has shot its own, and a column
  // that accepts both means switching to real photos later is an UPDATE
  // rather than a migration.
  if (/^https?:\/\//i.test(path)) return path;

  // A deployment without credentials still renders the marketing pages;
  // a missing base here means the fallback art, not a broken <img>.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  // Names can carry spaces or Persian characters, but the slashes of a
  // nested path have to survive encoding.
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}${PUBLIC_BASE}/${bucket}/${encoded}`;
}

export const programCoverUrl = (path: string | null | undefined) =>
  publicUrl("program-covers", path);

export const exerciseThumbUrl = (path: string | null | undefined) =>
  publicUrl("exercise-thumbs", path);

export const avatarUrl = (path: string | null | undefined) =>
  publicUrl("avatars", path);

export const gymMediaUrl = (path: string | null | undefined) =>
  publicUrl("gym-media", path);
