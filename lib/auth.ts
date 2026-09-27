/** Username sign-in.
 *
 *  Supabase Auth has no username grant, so each account is mapped to a
 *  deterministic internal address: `ali` signs in as
 *  `ali@fitclub.invalid`. `.invalid` is reserved by RFC 2606 and can
 *  never resolve, so nothing is ever delivered there and the address
 *  cannot collide with a real mailbox.
 *
 *  Deriving it on the client keeps sign-in to one request. A lookup
 *  endpoint would also hand anyone a way to test whether a username
 *  exists, which is a membership list the gym has not agreed to publish.
 */

export const AUTH_DOMAIN = "fitclub.invalid";

/** Mirrors profiles.username_format and the check inside
 *  admin_create_user, so the three cannot drift apart. Underscore is the
 *  only separator: "was it a dot or a dash?" is a support call at the
 *  counter that nobody needs. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normaliseUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    // Persian and Arabic-Indic digits, in case the keyboard is left in
    // Persian while typing a name that contains numbers.
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function isValidUsername(input: string): boolean {
  return USERNAME_PATTERN.test(normaliseUsername(input));
}

export function usernameToEmail(input: string): string {
  return `${normaliseUsername(input)}@${AUTH_DOMAIN}`;
}
