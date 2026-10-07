/** Banner links. Kept free of imports so `node --test` can load it.
 *
 *  A banner link reaches every member's phone, so it is either a path
 *  inside the app or an https address. Anything else (javascript:, data:,
 *  a protocol-relative //host) is refused here and again by the
 *  database's link_safe check. */

export type LinkCheck = { ok: true; url: string | null } | { ok: false };

export function checkBannerLink(raw: string): LinkCheck {
  const v = raw.trim();
  if (!v) return { ok: true, url: null };
  // Protocol-relative (//host) would leave the app on the current scheme.
  if (/^[/\\]{2}/.test(v)) return { ok: false };
  if (/^\/[^/\\]/.test(v) || v === "/") return { ok: true, url: v };
  // A bare domain is what people paste; give it the scheme it needs.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "https:" || !u.hostname.includes(".")) return { ok: false };
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false };
  }
}

/** Whether a link leaves the app, so the banner can open it in a new tab. */
export function isExternal(url: string): boolean {
  return /^https:\/\//.test(url);
}
