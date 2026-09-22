/** The one place a brand colour may appear as a literal.
 *
 *  The browser reads theme-color and the manifest before any CSS loads,
 *  so a var() is not resolvable there. Rather than scatter the hex, both
 *  read it from here — and the colour lint exempts this file alone.
 *
 *  Keep in sync with --color-fc-ink in app/globals.css.
 */
export const BRAND_GROUND = "#080b11";
