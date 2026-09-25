/** Public Storage URLs.
 *
 *  The cover buckets are public, so the address is predictable and needs
 *  no client, no round trip and no signing — which matters because these
 *  render inside a server component on every programme view, and because
 *  a signed URL expires out from under the service worker's cache.
 */

const PUBLIC_BASE = "/storage/v1/object/public";

function publicUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;

  // A deployment without credentials still renders the marketing pages;
  // a missing base here means the fallback gradient, not a broken <img>.
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  // Names can carry spaces or Persian characters, but the slashes of a
  // nested path have to survive encoding.
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base}${PUBLIC_BASE}/${bucket}/${encoded}`;
}

export function programCoverUrl(path: string | null | undefined): string | null {
  return publicUrl("program-covers", path);
}
