/** Username sign-in.
 *
 *  Supabase authenticates against an email or a phone, never a free-form
 *  username, so every username maps to a fixed internal address. The
 *  client derives it locally rather than asking the server, which means
 *  there is no endpoint a stranger can use to test which usernames exist.
 *
 *  .invalid is reserved by RFC 2606 for addresses that must never
 *  resolve, so no mail can reach one by accident. Members never see it.
 */
const INTERNAL_DOMAIN = "fitclub.invalid";

export const USERNAME_RULE = /^[a-z0-9_]{3,32}$/;

/** Trims, lowercases, and converts Persian digits so "ALI_۱۲" works. */
export function normalizeUsername(raw: string): string {
  const fa = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return raw
    .trim()
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

/** The reason a username is unacceptable, or null when it is fine. */
export function usernameProblem(username: string): string | null {
  if (username.length < 3) return "نام کاربری حداقل ۳ کاراکتر است.";
  if (username.length > 32) return "نام کاربری حداکثر ۳۲ کاراکتر است.";
  if (!USERNAME_RULE.test(username))
    return "فقط حروف انگلیسی کوچک، عدد و زیرخط مجاز است.";
  return null;
}

export function usernameToEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_DOMAIN}`;
}

/** Turns the stored address back into the name to display. */
export function emailToUsername(email: string | null | undefined): string | null {
  if (!email?.endsWith(`@${INTERNAL_DOMAIN}`)) return null;
  return email.slice(0, -(INTERNAL_DOMAIN.length + 1));
}
